// Offline visual regression harness only. Not imported by the application or production build.
import { createRoot } from "react-dom/client";
import { App } from "../../src/client/app";
import type { PublicTask, TaskState } from "../../src/shared/contracts";
import "../../src/client/styles.css";

const replaceState = window.history.replaceState.bind(window.history);
window.history.replaceState = (data, unused, url) => {
  const query = new URL(String(url ?? location.href), location.href).search;
  replaceState(data, unused, `/test/fixtures/chat-preview.html${query}`);
};

let task: PublicTask = {
  id: "fixture",
  mode: "chat",
  prompt: "Explain binary search in two short sentences.",
  state: "PLANNING",
  modelId: "Offline UI fixture",
  createdAt: "2026-10-31T10:00:00Z",
  updatedAt: "2026-10-31T10:00:00Z",
  events: [
    {
      id: 1,
      taskId: "fixture",
      timestamp: "2026-10-31T10:00:00Z",
      type: "task.created",
      data: {},
    },
  ],
};
const historyKey = "mercatum-history-preview-removed";
const removed = new Set<string>(
  JSON.parse(sessionStorage.getItem(historyKey) ?? "[]"),
);
const otherTask: PublicTask = {
  ...task,
  id: "other-fixture",
  prompt: "Keep this other conversation.",
  state: "SUCCEEDED",
};
const streams = new Set<FixtureEventSource>();
class FixtureEventSource {
  onmessage: (() => void) | null = null;
  constructor() {
    streams.add(this);
  }
  close() {
    streams.delete(this);
  }
}
// The only transport replacements live in this offline harness.
window.EventSource = FixtureEventSource as unknown as typeof EventSource;
window.fetch = async (input, init) => {
  const path = String(input);
  const json = (value: unknown) =>
    new Response(JSON.stringify(value), {
      headers: { "Content-Type": "application/json" },
    });
  if (path === "/api/session") return json({ csrf: "offline-fixture" });
  if (path === "/api/providers")
    return json({
      providers: [
        {
          id: "demo-provider",
          name: "mercaTUM Studio",
          modelId: "Offline UI fixture",
          priceSats: 100,
          capacity: { fiveHour: 72, weekly: 86 },
          isDemo: true,
          ready: false,
        },
      ],
      readiness: {
        ready: false,
        model: false,
        wallet: false,
        paymentsEnabled: false,
        blockers: ["Offline UI fixture"],
      },
    });
  if (path === "/api/tasks" && init?.method === "POST") {
    task = {
      ...task,
      prompt: JSON.parse(String(init.body)).prompt,
      selection: JSON.parse(String(init.body)).selection,
      state: "PLANNING",
      result: undefined,
      error: undefined,
      events: task.events.slice(0, 1),
    };
    return json(task);
  }
  if (path.endsWith("/history") && init?.method === "DELETE") {
    if (new URLSearchParams(location.search).has("deleteError"))
      return new Response(
        JSON.stringify({
          error: { message: "Offline deletion failure. Try again." },
        }),
        { status: 503 },
      );
    removed.add(path.split("/")[3]);
    sessionStorage.setItem(historyKey, JSON.stringify([...removed]));
    return json({ removed: true });
  }
  if (path === "/api/tasks")
    return json([task, otherTask].filter((t) => !removed.has(t.id)));
  if (path === "/api/tasks/other-fixture") return json(otherTask);

  if (path === "/api/payments/fixture-attempt/reconcile") {
    if (task.attempt?.state === "APPROVED") {
      task = {
        ...task,
        state: "AWAITING_APPROVAL",
        attempt: undefined,
        error: {
          code: "PAYMENT_NOT_STARTED",
          message:
            "The wallet transaction was never started. Review a fresh quote to try again.",
        },
      };
      return json({ attempt: { state: "REJECTED", hasProof: false } });
    }
    return json({ attempt: task.attempt });
  }
  if (path === "/api/tasks/fixture") return json(task);
  throw new Error(`Offline fixture does not implement ${path}`);
};
function setState(state: TaskState, streaming = false) {
  task = {
    ...task,
    state,
    result: undefined,
    error: undefined,
    attempt: undefined,
    events: task.events.slice(0, 1),
  };
  if (state === "RUNNING")
    task.events.push({
      id: 2,
      taskId: task.id,
      timestamp: task.createdAt,
      type: "execution.started",
      data: {},
    });
  if (streaming)
    task.events.push({
      id: 3,
      taskId: task.id,
      timestamp: task.createdAt,
      type: "execution.text_delta",
      data: {
        text: "Binary search finds an item in a **sorted list** by repeatedly halving the search range.",
      },
    });
  if (state === "SUCCEEDED")
    task.result = {
      answer:
        "Binary search finds an item in a **sorted list** by repeatedly halving the search range. Each comparison discards the half that cannot contain the target, so the search takes **O(log n)** steps.",
      completion: "complete",
      artifacts: [],
      checks: "not_run",
      modelId: "Offline UI fixture",
    };
  if (state === "FAILED")
    task.error = {
      code: "PLANNING_FAILED",
      message: "Planning could not finish. No payment was made.",
    };
  streams.forEach((stream) => stream.onmessage?.());
}
function paymentRecovery(phase?: "sign_requested" | "APPROVED") {
  task = {
    ...task,
    state: phase === "APPROVED" ? "PAYMENT_PENDING" : "PAYMENT_UNKNOWN",
    result: undefined,
    error: undefined,
    quote: undefined,
    attempt: {
      id: "fixture-attempt",
      taskId: task.id,
      quoteId: "fixture-quote",
      state: phase === "APPROVED" ? "APPROVED" : "PAYMENT_UNKNOWN",
      createdAt: task.createdAt,
      approval: {
        approved: true,
        feePolicy: "review-before-sign",
        maxAuthorizedDebitSats: 1000,
      },
    },
  };
  if (phase === "sign_requested")
    localStorage.setItem(
      "mercatum:payment:fixture-attempt",
      JSON.stringify({ phase }),
    );
  else localStorage.removeItem("mercatum:payment:fixture-attempt");
  streams.forEach((stream) => stream.onmessage?.());
}
createRoot(document.getElementById("fixture-controls")!).render(
  <div
    style={{
      position: "fixed",
      bottom: 100,
      left: 10,
      zIndex: 100,
      padding: 8,
      maxWidth: 230,
      background: "#fff6d7",
      color: "#222",
      border: "1px solid #c4ad6c",
      font: "12px sans-serif",
    }}
  >
    <strong>Offline UI fixture · no model or payments</strong>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      <button onClick={() => setState("PLANNING")}>Planning</button>
      <button onClick={() => setState("AWAITING_APPROVAL")}>Approval</button>
      <button onClick={() => setState("RUNNING")}>Running</button>
      <button onClick={() => setState("RUNNING", true)}>Streaming</button>
      <button onClick={() => setState("SUCCEEDED")}>Completed</button>
      <button onClick={() => setState("FAILED")}>Failed</button>
      <button onClick={() => paymentRecovery("APPROVED")}>
        Unstarted payment
      </button>
      <button onClick={() => paymentRecovery("sign_requested")}>
        Lost signature
      </button>
      <button onClick={() => paymentRecovery()}>Missing evidence</button>
    </div>
  </div>,
);
createRoot(document.getElementById("root")!).render(<App />);
