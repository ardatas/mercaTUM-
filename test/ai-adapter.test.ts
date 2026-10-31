import { describe, expect, it } from "vitest";
import type {
  Response as ModelResponse,
  ResponseCreateParams,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";
import {
  ResponsesAdapter,
  type ResponsesTransport,
} from "../src/server/ai/adapter.js";
import { DEFAULT_LIMITS, type Task } from "../src/shared/contracts.js";

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
      adapterId: "openai-responses",
      modelId: "saved-model",
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
function response(
  text = "",
  output: unknown[] = [],
  rest: Partial<ModelResponse> = {},
): ModelResponse {
  // SDK response fixture represents only fields used by the adapter boundary.
  return {
    id: "resp-fixture",
    status: "completed",
    output_text: text,
    output,
    model: "saved-model",
    usage: {
      input_tokens: 20,
      output_tokens: 10,
      total_tokens: 30,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens_details: { reasoning_tokens: 0 },
    },
    ...rest,
  } as ModelResponse;
}
function paidCall(
  args: object = {
    taskId: "task-one",
    providerId: "demo-provider",
    outputKind: "answer",
  },
  id = "call-original",
) {
  return {
    type: "function_call",
    id: `fc-${id}`,
    call_id: id,
    name: "request_paid_execution",
    arguments: JSON.stringify(args),
    status: "completed",
  };
}
function assessment(fits = true) {
  return response(
    JSON.stringify({
      fits,
      scopeSummary: "Explain binary search.",
      intendedDeliverable: "One concise answer.",
      reason: fits
        ? ""
        : "This task requires a terminal and cannot fit this service.",
    }),
  );
}
function client(
  responses: (ModelResponse | AsyncIterable<ResponseStreamEvent>)[],
) {
  const requests: ResponseCreateParams[] = [];
  const transport: ResponsesTransport = {
    async create(params) {
      requests.push(params);
      const result = responses.shift();
      if (!result) throw new Error("Unexpected provider call");
      return result;
    },
  };
  return {
    adapter: new ResponsesAdapter({ apiKey: "", client: transport }),
    requests,
  };
}
async function* stream(events: unknown[]) {
  for (const event of events) yield event as ResponseStreamEvent;
}

describe("Responses adapter payment suspension and continuation", () => {
  it("preserves encrypted reasoning, assistant phase, and the actual original call ID across resume", async () => {
    const output = [
      {
        type: "reasoning",
        id: "reasoning-one",
        encrypted_content: "opaque-checkpoint",
        summary: [],
      },
      {
        type: "message",
        id: "message-one",
        role: "assistant",
        phase: "commentary",
        status: "completed",
        content: [
          { type: "output_text", text: "Scope checked.", annotations: [] },
        ],
      },
      paidCall(),
    ];
    const { adapter, requests } = client([
      assessment(),
      response("", output),
      response("Complete."),
    ]);
    const plan = await adapter.plan(task());
    expect(plan.pendingCall.callId).toBe("call-original");
    expect(plan.pendingCall.checkpoint).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "reasoning",
          encrypted_content: "opaque-checkpoint",
        }),
        expect.objectContaining({ type: "message", phase: "commentary" }),
      ]),
    );
    expect(requests).toHaveLength(2);
    const result = {
      answer: "Binary search halves a sorted range.",
      completion: "complete" as const,
      modelId: "saved-model",
      checks: "not_run" as const,
      artifacts: [],
    };
    await adapter.resume(
      task({ pendingCall: plan.pendingCall, receiptId: "receipt-one" }),
      "receipt-one",
      result,
    );
    const resumed = requests[2];
    expect(resumed.input).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "function_call_output",
          call_id: "call-original",
        }),
      ]),
    );
    expect(resumed).not.toHaveProperty("previous_response_id");
    expect(
      requests.every((r) => r.store === false && r.model === "saved-model"),
    ).toBe(true);
  });
  it.each([
    [
      paidCall({
        taskId: "other-task",
        providerId: "demo-provider",
        outputKind: "answer",
      }),
    ],
    [
      paidCall({
        taskId: "task-one",
        providerId: "demo-provider",
        outputKind: "answer",
        priceSats: 1,
      }),
    ],
    [paidCall(), paidCall(undefined, "second")],
    [
      paidCall({
        taskId: "task-one",
        providerId: "demo-provider",
        outputKind: "changes",
      }),
    ],
  ])("rejects malformed or parallel paid requests %#", async (...calls) => {
    const { adapter } = client([assessment(), response("", calls)]);
    await expect(adapter.plan(task())).rejects.toMatchObject({
      code: "INVALID_AGENT_CALL",
    });
  });
  it("rejects scope before creating any payable tool call", async () => {
    const { adapter, requests } = client([assessment(false)]);
    await expect(adapter.plan(task())).rejects.toMatchObject({
      code: "SCOPE_REJECTED",
    });
    expect(requests).toHaveLength(1);
  });
  it("rejects over-limit context before calling the provider", async () => {
    const { adapter, requests } = client([]);
    await expect(
      adapter.plan(
        task({ context: "x".repeat(DEFAULT_LIMITS.maxContextBytes + 1) }),
      ),
    ).rejects.toMatchObject({ code: "SCOPE_REJECTED" });
    expect(requests).toHaveLength(0);
  });
  it("requires the saved receipt and exact call checkpoint for continuation", async () => {
    const { adapter, requests } = client([]);
    await expect(
      adapter.resume(task(), "receipt-forged", {
        answer: "x",
        completion: "complete",
        modelId: "saved-model",
        checks: "not_run",
        artifacts: [],
      }),
    ).rejects.toMatchObject({ code: "INVALID_AGENT_CALL" });
    expect(requests).toHaveLength(0);
  });
});

describe("Responses adapter execution boundaries", () => {
  it("streams only actual text deltas and uses immutable saved model and token limits", async () => {
    const { adapter, requests } = client([
      stream([
        {
          type: "response.reasoning_summary_text.delta",
          delta: "Private reasoning",
        },
        { type: "response.output_text.delta", delta: "Actual answer" },
        { type: "response.completed", response: response("Actual answer") },
      ]),
    ]);
    const deltas: string[] = [];
    const result = await adapter.execute(task(), (text) => {
      deltas.push(text);
    });
    expect(deltas).toEqual(["Actual answer"]);
    expect(result).toMatchObject({
      answer: "Actual answer",
      completion: "complete",
      checks: "not_run",
      usage: { inputTokens: 20, outputTokens: 10 },
    });
    expect(requests[0]).toMatchObject({
      model: "saved-model",
      max_output_tokens: DEFAULT_LIMITS.maxOutputTokens,
      store: false,
      stream: true,
    });
  });
  it("treats a known token limit as partial and publishes no truncated code patch", async () => {
    const final = response('{"summary":', [], {
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
    });
    const { adapter } = client([
      stream([
        { type: "response.output_text.delta", delta: '{"summary":' },
        { type: "response.incomplete", response: final },
      ]),
    ]);
    const deltas: string[] = [];
    const result = await adapter.execute(
      task({ mode: "code", snapshotId: "snapshot-one" }),
      (text) => {
        deltas.push(text);
      },
    );
    expect(result).toMatchObject({
      completion: "partial",
      limitReason: "max_output_tokens",
      artifacts: [],
    });
    expect(result).not.toHaveProperty("changeSet");
    expect(deltas).toEqual([]);
  });
  it("does not invent completion for a disconnected stream", async () => {
    const { adapter } = client([
      stream([{ type: "response.output_text.delta", delta: "Only part" }]),
    ]);
    await expect(adapter.execute(task(), () => {})).rejects.toMatchObject({
      code: "EXECUTION_UNKNOWN",
    });
  });
  it("keeps changes private and untrusted until repository validation", async () => {
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
    const { adapter } = client([
      stream([
        {
          type: "response.completed",
          response: response(JSON.stringify(code)),
        },
      ]),
    ]);
    const result = await adapter.execute(
      task({ mode: "code", snapshotId: "snapshot-one" }),
      () => {},
    );
    expect(result.artifacts).toEqual([]);
    expect(result.changeSet).toEqual({
      summary: "Add helper.",
      changes: [
        {
          path: "helper.ts",
          operation: "create",
          newContent: "export const answer = 42;\n",
        },
      ],
    });
  });
  it("returns false readiness without credentials and never performs an API call", async () => {
    expect(
      await new ResponsesAdapter({ apiKey: "" }).probe("configured-model"),
    ).toBe(false);
  });
  it("bounds continuation by the execution lease", async () => {
    const { adapter, requests } = client([]);
    await expect(
      adapter.execute(task({ leaseUntil: Date.now() - 10 }), () => {}),
    ).rejects.toMatchObject({ code: "EXECUTION_UNKNOWN" });
    expect(requests).toHaveLength(0);
  });
});
