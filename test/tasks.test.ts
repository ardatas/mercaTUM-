import { afterEach, describe, it, expect, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store, now } from "../src/server/tasks/store";
import { TaskService, type AiAdapter } from "../src/server/tasks/service";
import { readConfig } from "../src/server/config";
import {
  AppError,
  type Task,
  type Receipt,
  type TaskResult,
} from "../src/shared/contracts";
const dirs: string[] = [];
const stores: Store[] = [];
afterEach(() => {
  for (const s of stores.splice(0))
    try {
      s.close();
    } catch {}
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
const result: TaskResult = {
  answer: "A real fixture for offline tests.",
  completion: "complete",
  modelId: "test-model",
  checks: "not_run",
  artifacts: [],
};
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "mercatum-test-"));
  dirs.push(dir);
  const store = new Store(join(dir, "app.sqlite"));
  stores.push(store);
  const config = readConfig({ MODEL_ID: "test-model" });
  const ai: AiAdapter = {
    plan: vi.fn<AiAdapter["plan"]>(async (t) => ({
      pendingCall: {
        callId: "call1",
        arguments: {
          taskId: t.id,
          providerId: "demo-provider",
          outputKind: "answer",
        },
        checkpoint: [{ private: "secret-checkpoint" }],
        state: "pending",
      },
      scopeSummary: "Bounded task",
      intendedDeliverable: "An answer",
    })),
    execute: vi.fn(async () => ({ ...result })),
    resume: vi.fn(async () => ({ answer: "Resumed" })),
  };
  const svc = new TaskService(
    store,
    config,
    ai,
    { context: () => "", changes: () => [] },
    () => true,
  );
  return { dir, store, config, ai, svc };
}
async function task(s: ReturnType<typeof setup>) {
  const t = s.svc.create(
    "alice",
    { mode: "chat", prompt: "Explain a tree", providerId: "demo-provider" },
    "create-task-1",
  );
  await new Promise((r) => setTimeout(r, 5));
  return t.id;
}
function pay(s: ReturnType<typeof setup>, id: string) {
  const receipt: Receipt = {
    id: "receipt1",
    ownerId: "alice",
    taskId: id,
    quoteId: "q",
    attemptId: "a",
    network: "testnet",
    txid: "a".repeat(64),
    outputIndex: 0,
    amountSats: 100,
    recipient: "recipient",
    verifiedAt: now(),
    arcade: {
      submittedAt: now(),
      postStatus: "200",
      status: "SEEN_ON_NETWORK",
      networkKnown: true,
    },
    internalized: true,
    explorerUrl: "https://test.whatsonchain.com/tx/" + "a".repeat(64),
  };
  s.store.saveReceipt(receipt);
  s.store.updateTask(id, (t) => {
    t.state = "READY";
    t.receiptId = receipt.id;
  });
}
describe("durable entitlement and execution", () => {
  it("keeps a history removal after restart and worker updates without losing entitlement", async () => {
    const s = setup();
    const id = await task(s);
    pay(s, id);
    const before = s.svc.get("alice", id);
    s.svc.removeFromHistory("alice", id);
    expect(s.svc.list("alice")).toEqual([]);
    expect(s.svc.get("alice", id)).toEqual(before);
    await s.svc.run(id);
    expect(s.svc.get("alice", id).state).toBe("SUCCEEDED");
    expect(s.svc.get("alice", id).receipt).toEqual(before.receipt);
    expect(s.svc.list("alice")).toEqual([]);
    s.store.close();
    const reopened = new Store(join(s.dir, "app.sqlite"));
    stores.push(reopened);
    const service = new TaskService(
      reopened,
      s.config,
      s.ai,
      { context: () => "", changes: () => [] },
      () => true,
    );
    expect(service.list("alice")).toEqual([]);
    expect(service.get("alice", id).receipt).toEqual(before.receipt);
    expect(service.get("alice", id).result).toBeDefined();
    expect(() => service.removeFromHistory("bob", id)).toThrow();
  });
  it("pins the selected Gemini adapter and model when creating a task", async () => {
    const s = setup();
    s.config.MODEL_PROVIDER = "gemini";
    s.config.MODEL_ID = "gemini-3.8-flash";
    const id = await task(s);
    s.config.MODEL_PROVIDER = "openai";
    s.config.MODEL_ID = "another-model";
    const saved = s.store.get<Task>("task", id)!;
    expect(saved.config.adapterId).toBe("gemini-generate-content");
    expect(saved.config.modelId).toBe("gemini-3.8-flash");
    expect(s.ai.execute).not.toHaveBeenCalled();
  });
  it("never invokes paid execution before server receipt, scopes ownership and hides checkpoints", async () => {
    const s = setup(),
      id = await task(s);
    await s.svc.run(id);
    expect(s.ai.execute).not.toHaveBeenCalled();
    expect(() => s.svc.get("bob", id)).toThrow();
    expect(JSON.stringify(s.svc.get("alice", id))).not.toContain(
      "secret-checkpoint",
    );
    expect(s.store.get<Task>("task", id)?.state).toBe("AWAITING_APPROVAL");
  });
  it("idempotency reuses one task and rejects mismatched commands", async () => {
    const s = setup(),
      id = await task(s);
    expect(
      s.svc.create(
        "alice",
        { mode: "chat", prompt: "Explain a tree", providerId: "demo-provider" },
        "create-task-1",
      ).id,
    ).toBe(id);
    expect(() =>
      s.svc.create(
        "alice",
        { mode: "chat", prompt: "Another body", providerId: "demo-provider" },
        "create-task-1",
      ),
    ).toThrow("different input");
    expect(s.store.list("task")).toHaveLength(1);
  });
  it("concurrent claims execute once and preserve quoted model against defaults", async () => {
    const s = setup(),
      id = await task(s);
    pay(s, id);
    s.config.MODEL_ID = "changed-default";
    await Promise.all([s.svc.run(id), s.svc.run(id), s.svc.run(id)]);
    expect(s.ai.execute).toHaveBeenCalledTimes(1);
    expect(vi.mocked(s.ai.execute).mock.calls[0][0].config.modelId).toBe(
      "test-model",
    );
    expect(s.svc.get("alice", id).state).toBe("SUCCEEDED");
    expect(s.ai.resume).toHaveBeenCalledTimes(1);
  });
  it("unknown execution retains receipt; explicit recovery has no payment path and cannot bypass budget", async () => {
    const s = setup(),
      id = await task(s);
    pay(s, id);
    vi.mocked(s.ai.execute).mockRejectedValueOnce(
      new AppError("EXECUTION_UNKNOWN", "timeout"),
    );
    await s.svc.run(id);
    expect(s.svc.get("alice", id).state).toBe("EXECUTION_UNKNOWN");
    expect(s.store.receipt(id)?.id).toBe("receipt1");
    s.svc.retry("alice", id, "retry-task-1");
    await s.svc.run(id);
    expect(s.svc.get("alice", id).state).toBe("SUCCEEDED");
    expect(s.store.get<Task>("task", id)?.outputTokensUsed).toBe(9216);
    expect(() => s.svc.retry("alice", id, "retry-task-2")).toThrow();
  });
  it("resumes saved result without invoking executor again after continuation failure", async () => {
    const s = setup(),
      id = await task(s);
    pay(s, id);
    vi.mocked(s.ai.resume).mockRejectedValueOnce(new Error("provider timeout"));
    await s.svc.run(id);
    expect(s.svc.get("alice", id).state).toBe("FAILED_PAID");
    s.svc.retry("alice", id, "retry-resume");
    await s.svc.run(id);
    expect(s.ai.execute).toHaveBeenCalledTimes(1);
    expect(s.ai.resume).toHaveBeenCalledTimes(2);
    expect(s.svc.get("alice", id).state).toBe("SUCCEEDED");
  });
  it("known output exhaustion remains partial and cannot retry into extra scope", async () => {
    const s = setup(),
      id = await task(s);
    pay(s, id);
    vi.mocked(s.ai.execute).mockResolvedValue({
      ...result,
      completion: "partial",
      limitReason: "max_output_tokens",
    });
    await s.svc.run(id);
    expect(s.svc.get("alice", id).state).toBe("LIMIT_REACHED");
    expect(() => s.svc.retry("alice", id, "retry-partial")).toThrow();
    expect(s.svc.get("alice", id).result?.answer).toBe(result.answer);
  });
  it("persists receipts and marks started jobs unknown on restart, fencing stale publishers", async () => {
    const s = setup(),
      id = await task(s);
    pay(s, id);
    const claimed = s.store.claim(id)!;
    s.store.fenced(id, claimed.generation, (t) => {
      t.upstreamStarted = true;
    });
    s.store.close();
    const reopened = new Store(join(s.dir, "app.sqlite"));
    stores.push(reopened);
    reopened.recover();
    expect(reopened.get<Task>("task", id)?.state).toBe("EXECUTION_UNKNOWN");
    expect(reopened.receipt(id)?.id).toBe("receipt1");
    expect(() => reopened.fenced(id, claimed.generation, () => {})).toThrow(
      "expired",
    );
  });
  it("expired started lease cannot publish and is moved to unknown by sweeper", async () => {
    const s = setup(),
      id = await task(s);
    pay(s, id);
    const claimed = s.store.claim(id)!;
    s.store.updateTask(id, (t) => {
      t.upstreamStarted = true;
      t.leaseUntil = Date.now() - 1;
    });
    await s.svc.tick();
    expect(s.svc.get("alice", id).state).toBe("EXECUTION_UNKNOWN");
    expect(() =>
      s.store.fenced(id, claimed.generation, (t) => {
        t.result = result;
      }),
    ).toThrow();
  });
  it("forbids forged command fields and extensions to another owner", async () => {
    const s = setup(),
      id = await task(s);
    expect(() =>
      s.svc.create(
        "alice",
        { mode: "chat", prompt: "x", providerId: "demo-provider", paid: true },
        "forged-key",
      ),
    ).toThrow();
    expect(() =>
      s.svc.create(
        "bob",
        {
          mode: "chat",
          prompt: "x",
          providerId: "demo-provider",
          extensionOfTaskId: id,
        },
        "extension-key",
      ),
    ).toThrow();
  });
  it("rejects duplicate receipt outpoints and keeps original entitlement", async () => {
    const s = setup(),
      id = await task(s);
    pay(s, id);
    expect(() =>
      s.store.saveReceipt({ ...s.store.receipt(id)!, taskId: "other" }),
    ).toThrow();
    expect(s.store.receipt(id)?.taskId).toBe(id);
  });
});

describe("shared admission and known-limit recovery", () => {
  it("applies a durable owner quota across callers without charging an idempotent replay", async () => {
    const s = setup();
    for (let i = 0; i < 10; i++) {
      s.svc.create(
        "alice",
        { mode: "chat", prompt: "Task " + i, providerId: "demo-provider" },
        "quota-key-" + i,
      );
    }
    expect(() =>
      s.svc.create(
        "alice",
        { mode: "chat", prompt: "Task 10", providerId: "demo-provider" },
        "quota-key-10",
      ),
    ).toThrow("allowance");
    expect(() =>
      s.svc.create(
        "alice",
        { mode: "chat", prompt: "Task 0", providerId: "demo-provider" },
        "quota-key-0",
      ),
    ).not.toThrow();
    await new Promise((r) => setTimeout(r, 5));
  });
  it("preserves LIMIT_REACHED when coordinator resume fails and across process recovery", async () => {
    const s = setup(),
      id = await task(s);
    pay(s, id);
    vi.mocked(s.ai.execute).mockResolvedValue({
      ...result,
      completion: "partial",
      limitReason: "max_output_tokens",
    });
    vi.mocked(s.ai.resume).mockRejectedValue(new Error("resume failed"));
    await s.svc.run(id);
    expect(s.svc.get("alice", id).state).toBe("LIMIT_REACHED");
    expect(s.svc.get("alice", id).events.at(-1)?.type).toBe(
      "task.limit_reached",
    );
    expect(() => s.svc.retry("alice", id, "limit-retry")).toThrow();
    s.store.updateTask(id, (t) => {
      t.state = "RUNNING";
      t.upstreamStarted = true;
    });
    s.store.recover();
    expect(s.svc.get("alice", id).state).toBe("LIMIT_REACHED");
  });
});

it("persists catalog selection and native effort without changing the configured execution model", async () => {
  const s = setup();
  s.config.MODEL_PROVIDER = "gemini";
  const command = {
    mode: "chat",
    prompt: "Explain a tree",
    providerId: "demo-provider",
    selection: {
      offerId: "claude-max",
      modelId: "claude-opus-5-5",
      effort: "max",
    },
  };
  const t = s.svc.create("alice", command, "selected-task");
  await new Promise((r) => setTimeout(r, 5));
  expect(s.svc.get("alice", t.id).selection).toEqual(command.selection);
  const stored = s.store.get<Task>("task", t.id)!;
  expect(stored.config.modelId).toBe("test-model");
  expect(stored.config.thinkingLevel).toBe("HIGH");
  s.config.MODEL_ID = "changed-default";
  expect(s.store.get<Task>("task", t.id)!.config.modelId).toBe("test-model");
  expect(() =>
    s.svc.create(
      "alice",
      { ...command, selection: { ...command.selection, effort: "low" } },
      "selected-task",
    ),
  ).toThrow();
  expect(s.svc.get("alice", t.id).receipt).toBeUndefined();
});
