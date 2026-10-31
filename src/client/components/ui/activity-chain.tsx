import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  ChevronDown,
  Clock3,
  LoaderCircle,
  Wrench,
  Wallet,
  FileCode2,
  AlertCircle,
} from "lucide-react";
import type { TaskEvent, TaskState } from "../../../shared/contracts";
// Adapted from supplied references 2 and 5. Only persisted events produce steps.
const labels: Record<string, string> = {
  "task.created": "Task saved",
  "agent.tool_requested": "Agent requested paid execution",
  "quote.created": "Fixed quote prepared",
  "payment.approval_required": "Waiting for your approval",
  "payment.submitted": "Payment submitted for verification",
  "payment.verified": "Payment verified",
  "execution.started": "Model execution started",
  "artifact.created": "Code artifact saved",
  "task.completed": "Task completed",
  "task.limit_reached": "Execution limit reached",
  "task.failed": "Task needs attention",
};
export function ActivityChain({
  events,
  state,
}: {
  events: TaskEvent[];
  state: TaskState;
}) {
  const [open, setOpen] = useState(true);
  const visible = events.filter((e) => e.type !== "execution.text_delta");
  const busy = ["PLANNING", "RUNNING", "PAYMENT_PENDING"].includes(state);
  return (
    <section className="activity-chain">
      <button
        className="activity-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {busy ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <Wrench size={17} />
        )}
        <span>{busy ? "Working on your task" : "Task activity"}</span>
        <span className="subtle">{visible.length} events</span>
        <ChevronDown size={15} className={open ? "rotate" : ""} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="activity-body"
          >
            {visible.map((e) => (
              <details key={e.id} className="activity-step">
                <summary>
                  <span className="step-dot">
                    {e.type === "task.failed" ? (
                      <AlertCircle size={13} />
                    ) : e.type.includes("payment") ? (
                      <Wallet size={13} />
                    ) : e.type === "artifact.created" ? (
                      <FileCode2 size={13} />
                    ) : (
                      <Check size={13} />
                    )}
                  </span>
                  <span>{labels[e.type] ?? e.type}</span>
                  <time>
                    {new Date(e.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </time>
                </summary>
                {Object.keys(e.data).length > 0 && (
                  <pre>{JSON.stringify(e.data, null, 2)}</pre>
                )}
              </details>
            ))}
            {busy && (
              <div className="activity-step current">
                <Clock3 size={14} />
                <span className="shimmer">
                  {state === "PLANNING"
                    ? "Checking the scope of your request"
                    : state === "RUNNING"
                      ? "Waiting for the model response"
                      : "Verifying the payment"}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
