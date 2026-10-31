import { useId, useState } from "react";
import { Check, ChevronDown, LoaderCircle, Sparkles } from "lucide-react";
import type { TaskEvent, TaskState } from "../../../shared/contracts";

// Reference 8's visual trace, driven only by public server events and task state.
// No synthetic sequence, reasoning text, tool output, or elapsed-time claims.
const steps: Record<string, string> = {
  "task.created": "Request received",
  "agent.tool_requested": "Request scoped",
  "quote.created": "Quote prepared",
  "payment.verified": "Payment verified",
  "execution.started": "Model started",
  "artifact.created": "Code changes saved",
};
const activeSteps: Partial<Record<TaskState, string>> = {
  CREATED: "Preparing your request",
  PLANNING: "Checking your request",
  PAYMENT_PENDING: "Verifying your payment",
  READY: "Waiting to start the model",
  RUNNING: "Writing your answer",
};

export function getStreamedAnswer(events: TaskEvent[]) {
  const start = events.findLastIndex(
    (event) => event.type === "execution.started",
  );
  if (start < 0) return "";
  return events
    .slice(start + 1)
    .filter(
      (event) =>
        event.type === "execution.text_delta" &&
        typeof event.data.text === "string",
    )
    .map((event) => event.data.text)
    .join("");
}

export default function ThinkingState({
  events,
  state,
  hasAnswer = false,
}: {
  events: TaskEvent[];
  state: TaskState;
  hasAnswer?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const traceId = useId();
  const current = activeSteps[state];
  // Paused, failed, and completed tasks must never look like ongoing thinking.
  if (!current || hasAnswer) return null;
  const visible = events.filter((event) => steps[event.type]);
  return (
    <section className="thinking" aria-label="Response progress">
      <button
        type="button"
        className="thinking-trigger"
        aria-expanded={expanded}
        aria-controls={traceId}
        onClick={() => setExpanded(!expanded)}
      >
        <Sparkles size={16} aria-hidden="true" />
        <span className="thinking-shimmer">
          {state === "PAYMENT_PENDING" ? "Verifying payment" : "Thinking"}
        </span>
        <ChevronDown
          size={14}
          className={expanded ? "rotate" : ""}
          aria-hidden="true"
        />
      </button>
      <div
        id={traceId}
        className={`thinking-trace ${expanded ? "expanded" : ""}`}
        inert={!expanded}
        aria-hidden={!expanded}
      >
        <div className="thinking-trace-clip">
          <ol className="thinking-steps">
            {visible.map((event) => (
              <li key={event.id}>
                <Check size={14} aria-hidden="true" />
                <span>{steps[event.type]}</span>
              </li>
            ))}
            <li className="thinking-current">
              <LoaderCircle size={14} className="spin" aria-hidden="true" />
              <span role="status">{current}</span>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
