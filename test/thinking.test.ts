import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ThinkingState, {
  getStreamedAnswer,
} from "../src/client/components/ui/thinking";
import type { TaskEvent, TaskState } from "../src/shared/contracts";

const events: TaskEvent[] = [
  {
    id: 1,
    taskId: "task",
    timestamp: "2026-10-31T10:00:00Z",
    type: "task.created",
    data: {},
  },
  {
    id: 2,
    taskId: "task",
    timestamp: "2026-10-31T10:00:01Z",
    type: "execution.text_delta",
    data: { text: "private fixture output" },
  },
  {
    id: 3,
    taskId: "task",
    timestamp: "2026-10-31T10:00:02Z",
    type: "unknown.tool",
    data: { secret: "must not render" },
  },
];
const render = (state: TaskState, hasAnswer = false) =>
  renderToStaticMarkup(
    createElement(ThinkingState, { state, events, hasAnswer }),
  );

describe("temporary response progress", () => {
  it("does not reuse an earlier attempt's answer when a paid retry starts", () => {
    const event = (id: number, type: string, text?: string): TaskEvent => ({
      id,
      taskId: "task",
      timestamp: "2026-10-31T10:00:00Z",
      type,
      data: { text },
    });
    const retry = [
      event(1, "execution.started"),
      event(2, "execution.text_delta", "old output"),
      event(3, "execution.started"),
    ];
    expect(getStreamedAnswer(retry)).toBe("");
    expect(
      getStreamedAnswer([
        ...retry,
        event(4, "execution.text_delta", "new output"),
      ]),
    ).toBe("new output");
    expect(
      getStreamedAnswer([event(1, "execution.text_delta", "orphaned output")]),
    ).toBe("");
  });
  it("uses confirmed public events and a current status without inventing steps or exposing payloads", () => {
    const html = render("PLANNING");
    expect(html).toContain("Request received");
    expect(html).toContain("Checking your request");
    expect(html).not.toContain("Payment verified");
    expect(html).not.toContain("private fixture output");
    expect(html).not.toContain("must not render");
    expect(html).not.toContain("unknown.tool");
  });
  it.each<TaskState>([
    "AWAITING_APPROVAL",
    "PAYMENT_UNKNOWN",
    "EXECUTION_UNKNOWN",
    "FAILED",
    "FAILED_PAID",
    "SCOPE_REJECTED",
    "CANCELLED",
    "SUCCEEDED",
    "LIMIT_REACHED",
  ])("does not show thinking for %s", (state) => {
    expect(render(state)).toBe("");
  });
  it("removes the trace as soon as answer output is available", () => {
    expect(render("RUNNING")).toContain("Writing your answer");
    expect(render("RUNNING", true)).toBe("");
  });
  it("distinguishes payment verification from model execution", () => {
    expect(render("PAYMENT_PENDING")).toContain("Verifying payment");
    expect(render("PAYMENT_PENDING")).not.toContain("Writing your answer");
    expect(render("READY")).toContain("Waiting to start the model");
  });
});
