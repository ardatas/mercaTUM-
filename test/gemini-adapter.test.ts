import { describe, expect, it } from "vitest";
import { GeminiAdapter } from "../src/server/ai/gemini.js";
import {
  DEFAULT_LIMITS,
  type Task,
  type TaskResult,
} from "../src/shared/contracts.js";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-one",
    ownerId: "buyer",
    mode: "chat",
    prompt: "Explain binary search briefly.",
    providerId: "demo-provider",
    createdAt: "2026-10-31T12:00:00Z",
    updatedAt: "2026-10-31T12:00:00Z",
    state: "PLANNING",
    config: {
      adapterId: "gemini-generate-content",
      modelId: "gemini-3-flash-preview",
      version: "v1",
      limits: { ...DEFAULT_LIMITS },
    },
    fingerprint: "hash",
    context: "",
    callsUsed: 0,
    outputTokensUsed: 0,
    recoveryAttempts: 0,
    generation: 0,
    ...overrides,
  };
}
function model(parts: object[], finishReason = "STOP") {
  return {
    candidates: [
      {
        content: { role: "model", parts },
        ...(finishReason ? { finishReason } : {}),
      },
    ],
    modelVersion: "gemini-3-flash-preview",
    usageMetadata: {
      promptTokenCount: 10,
      candidatesTokenCount: 4,
      thoughtsTokenCount: 2,
    },
  };
}
function assessment(fits = true) {
  return model([
    {
      text: JSON.stringify({
        fits,
        scopeSummary: "Explain binary search.",
        intendedDeliverable: "One concise answer.",
        reason: fits ? "" : "Needs a terminal.",
      }),
      thoughtSignature: "assessment-signature",
    },
  ]);
}
function call(overrides: object = {}) {
  return {
    functionCall: {
      id: "original-call",
      name: "request_paid_execution",
      args: {
        taskId: "task-one",
        providerId: "demo-provider",
        outputKind: "answer",
      },
      ...overrides,
    },
    thoughtSignature: "private-signature",
  };
}
function stream(events: unknown[], chunkSize = 11, crlf = false) {
  const separator = crlf ? "\r\n\r\n" : "\n\n";
  const bytes = new TextEncoder().encode(
    events
      .map((event) => `data: ${JSON.stringify(event)}${separator}`)
      .join(""),
  );
  return new Response(
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i += chunkSize)
          controller.enqueue(bytes.slice(i, i + chunkSize));
        controller.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
}
function client(responses: (object | Response | Error)[]) {
  const requests: {
    url: string;
    body: Record<string, any>;
    init: RequestInit;
  }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    requests.push({
      url: String(input),
      body: JSON.parse(String(init?.body)),
      init: init ?? {},
    });
    const next = responses.shift();
    if (!next) throw new Error("Unexpected provider request");
    if (next instanceof Error) throw next;
    return next instanceof Response ? next : Response.json(next);
  };
  return {
    adapter: new GeminiAdapter({ apiKey: "offline-secret", fetch: fetcher }),
    requests,
  };
}
const result: TaskResult = {
  answer: "Binary search halves a sorted range.",
  completion: "complete",
  modelId: "gemini-3-flash-preview",
  checks: "not_run",
  artifacts: [],
};

describe("Gemini native payment suspension", () => {
  it("retains complete parts, thought signatures and provider call ID through receipt-backed resume", async () => {
    const modelParts = [
      {
        text: "Private thought",
        thought: true,
        thoughtSignature: "opaque-reasoning",
      },
      call(),
    ];
    const { adapter, requests } = client([
      assessment(),
      model(modelParts),
      model([{ text: "Complete." }]),
    ]);
    const plan = await adapter.plan(task());
    expect(plan.pendingCall.callId).toBe("original-call");
    expect(plan.pendingCall.checkpoint.at(-1)).toEqual({
      role: "model",
      parts: modelParts,
    });
    expect(plan.usage).toEqual({ inputTokens: 20, outputTokens: 12 });
    await adapter.resume(
      task({ pendingCall: plan.pendingCall, receiptId: "receipt-one" }),
      "receipt-one",
      result,
    );
    const resumed = requests[2].body;
    expect(resumed.contents.at(-2)).toEqual({
      role: "model",
      parts: modelParts,
    });
    expect(resumed.contents.at(-1).parts[0].functionResponse).toMatchObject({
      id: "original-call",
      name: "request_paid_execution",
      response: { receiptId: "receipt-one", checks: "not_run" },
    });
    expect(resumed.toolConfig.functionCallingConfig.mode).toBe("NONE");
    expect(
      requests.every(
        (r) => !r.url.includes("offline-secret") && r.init.redirect === "error",
      ),
    ).toBe(true);
    expect(requests[1].body.toolConfig.functionCallingConfig).toEqual({
      mode: "ANY",
      allowedFunctionNames: ["request_paid_execution"],
    });
  });
  it.each([
    [call({ id: undefined })],
    [
      call({
        args: {
          taskId: "wrong",
          providerId: "demo-provider",
          outputKind: "answer",
        },
      }),
    ],
    [
      call({
        args: {
          taskId: "task-one",
          providerId: "demo-provider",
          outputKind: "answer",
          priceSats: 1,
        },
      }),
    ],
    [call(), call({ id: "another-call" })],
  ])("rejects mismatched, invented or parallel calls %#", async (...parts) => {
    const { adapter } = client([assessment(), model(parts)]);
    await expect(adapter.plan(task())).rejects.toMatchObject({
      code: "INVALID_AGENT_CALL",
    });
  });
  it("rejects scope before requesting a payable tool", async () => {
    const { adapter, requests } = client([assessment(false)]);
    await expect(adapter.plan(task())).rejects.toMatchObject({
      code: "SCOPE_REJECTED",
    });
    expect(requests).toHaveLength(1);
  });
  it("does not resume without an exact receipt and saved call", async () => {
    const { adapter, requests } = client([assessment(), model([call()])]);
    const plan = await adapter.plan(task());
    await expect(
      adapter.resume(
        task({ pendingCall: plan.pendingCall, receiptId: "receipt-one" }),
        "wrong",
        result,
      ),
    ).rejects.toMatchObject({ code: "INVALID_AGENT_CALL" });
    await expect(
      adapter.resume(
        task({
          pendingCall: { ...plan.pendingCall, callId: "forged" },
          receiptId: "receipt-one",
        }),
        "receipt-one",
        result,
      ),
    ).rejects.toMatchObject({ code: "INVALID_AGENT_CALL" });
    expect(requests).toHaveLength(2);
  });
  it("bounds input and rejects expired leases before network access", async () => {
    const { adapter, requests } = client([]);
    await expect(
      adapter.plan(
        task({ context: "x".repeat(DEFAULT_LIMITS.maxContextBytes + 1) }),
      ),
    ).rejects.toMatchObject({ code: "SCOPE_REJECTED" });
    await expect(
      adapter.execute(task({ leaseUntil: Date.now() - 100 }), () => {}),
    ).rejects.toMatchObject({ code: "EXECUTION_UNKNOWN" });
    expect(requests).toHaveLength(0);
  });
});

describe("Gemini streamed execution", () => {
  it("streams actual Unicode deltas, hides thoughts and counts thinking tokens", async () => {
    const { adapter, requests } = client([
      stream(
        [
          model([{ text: "Private", thought: true }], ""),
          model([{ text: "Answer ✓" }], ""),
          model([{ text: " done" }]),
        ],
        1,
        true,
      ),
    ]);
    const deltas: string[] = [];
    const answer = await adapter.execute(task(), (text) => {
      deltas.push(text);
    });
    expect(deltas).toEqual(["Answer ✓", " done"]);
    expect(answer).toMatchObject({
      answer: "Answer ✓ done",
      completion: "complete",
      usage: { inputTokens: 10, outputTokens: 6 },
      checks: "not_run",
    });
    expect(requests[0].url).toContain(":streamGenerateContent?alt=sse");
    expect(requests[0].body.generationConfig.maxOutputTokens).toBe(
      DEFAULT_LIMITS.maxOutputTokens,
    );
  });
  it("marks incomplete code as partial without publishing a truncated patch", async () => {
    const { adapter } = client([
      stream([model([{ text: '{"summary":' }], "MAX_TOKENS")]),
    ]);
    const deltas: string[] = [];
    const answer = await adapter.execute(task({ mode: "code" }), (text) => {
      deltas.push(text);
    });
    expect(answer).toMatchObject({
      completion: "partial",
      limitReason: "max_output_tokens",
      artifacts: [],
    });
    expect(answer.changeSet).toBeUndefined();
    expect(deltas).toEqual([]);
  });
  it("keeps structured code private until repository validation", async () => {
    const code = {
      summary: "Add helper.",
      changes: [
        {
          path: "helper.ts",
          operation: "create",
          expectedBaseHash: null,
          newContent: "export const answer = 42;\n",
        },
      ],
    };
    const { adapter, requests } = client([
      stream([model([{ text: JSON.stringify(code) }])]),
    ]);
    const answer = await adapter.execute(task({ mode: "code" }), () => {
      throw new Error("Code leaked");
    });
    expect(answer.changeSet).toEqual({
      summary: code.summary,
      changes: [
        {
          path: "helper.ts",
          operation: "create",
          newContent: code.changes[0].newContent,
        },
      ],
    });
    expect(answer.artifacts).toEqual([]);
    expect(requests[0].body.generationConfig.responseJsonSchema).toHaveProperty(
      "properties.changes",
    );
  });
  it("requires an explicit provider completion marker", async () => {
    const { adapter } = client([stream([model([{ text: "Only part" }], "")])]);
    await expect(adapter.execute(task(), () => {})).rejects.toMatchObject({
      code: "EXECUTION_UNKNOWN",
    });
  });
  it("does not turn safety rejection into successful output", async () => {
    const { adapter } = client([stream([model([], "SAFETY")])]);
    await expect(adapter.execute(task(), () => {})).rejects.toMatchObject({
      code: "EXECUTION_FAILED",
    });
  });
  it("sanitizes transport errors without exposing credentials or response bodies", async () => {
    const { adapter } = client([new Error("offline-secret raw upstream body")]);
    await expect(adapter.execute(task(), () => {})).rejects.toMatchObject({
      code: "EXECUTION_UNKNOWN",
    });
    const rejected = client([
      new Response("offline-secret upstream body", { status: 403 }),
    ]);
    await expect(
      rejected.adapter.execute(task(), () => {}),
    ).rejects.toMatchObject({
      code: "EXECUTION_FAILED",
      message:
        "The model request was rejected. Your payment entitlement is unchanged.",
    });
  });
  it("probes function calling and native signature-bearing continuation", async () => {
    const part = {
      functionCall: {
        name: "capability_probe",
        id: "probe-call",
        args: { ok: true },
      },
      thoughtSignature: "private-probe",
    };
    const { adapter, requests } = client([
      model([part]),
      model([{ text: "ready" }]),
    ]);
    expect(await adapter.probe("gemini-3.8-flash")).toBe(true);
    expect(requests.map((request) => request.body.generationConfig)).toEqual([
      expect.objectContaining({
        maxOutputTokens: 2048,
        thinkingConfig: { includeThoughts: false, thinkingLevel: "LOW" },
      }),
      expect.objectContaining({
        maxOutputTokens: 2048,
        thinkingConfig: { includeThoughts: false, thinkingLevel: "LOW" },
      }),
    ]);
    expect(requests[1].body.contents[1].parts).toEqual([part]);
    expect(
      await new GeminiAdapter({ apiKey: "" }).probe("gemini-3-flash-preview"),
    ).toBe(false);
  });
});

it("uses the frozen native effort for paid generation and preserves token caps", async () => {
  const { adapter, requests } = client([stream([model([{ text: "Answer" }])])]);
  const selected = task();
  selected.config.thinkingLevel = "HIGH";
  await adapter.execute(selected, () => {});
  expect(requests[0].body.generationConfig.thinkingConfig).toEqual({
    includeThoughts: false,
    thinkingLevel: "HIGH",
  });
  expect(requests[0].body.generationConfig.maxOutputTokens).toBe(
    DEFAULT_LIMITS.maxOutputTokens,
  );
});
