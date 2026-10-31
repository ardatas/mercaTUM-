import { useState, useEffect, type FormEvent } from "react";
import { ArrowUp, Code2, MessageSquare, Paperclip } from "lucide-react";
// Reference 3: expand once on initial focus; blur never contracts it.
export function PromptInput({
  mode,
  setMode,
  onSubmit,
  busy,
  model,
  hasContext,
  initialValue = "",
}: {
  mode: "chat" | "code";
  setMode: (m: "chat" | "code") => void;
  onSubmit: (prompt: string) => void;
  busy: boolean;
  model: string;
  hasContext: boolean;
  initialValue?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() && !busy) onSubmit(value.trim());
  };
  return (
    <form
      className={`prompt-box ${expanded ? "expanded" : ""}`}
      onSubmit={submit}
    >
      <textarea
        aria-label="Task prompt"
        placeholder={
          mode === "chat"
            ? "Ask anything…"
            : "What should change in this repository?"
        }
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setExpanded(true)}
        rows={2}
        maxLength={12000}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (value.trim() && !busy) onSubmit(value.trim());
          }
        }}
      />
      <div className="prompt-toolbar">
        <div className="mode-toggle">
          <button
            type="button"
            className={mode === "chat" ? "selected" : ""}
            onClick={() => setMode("chat")}
          >
            <MessageSquare size={14} />
            Chat
          </button>
          <button
            type="button"
            className={mode === "code" ? "selected" : ""}
            onClick={() => setMode("code")}
          >
            <Code2 size={15} />
            Code
          </button>
        </div>
        <span className="prompt-model">
          <span className="status-dot" />
          {model || "Model setup pending"}
        </span>
        {hasContext && (
          <span className="context-chip">
            <Paperclip size={13} />
            Context attached
          </span>
        )}
        <button
          className="send-button"
          type="submit"
          disabled={busy || !value.trim() || (mode === "code" && !hasContext)}
          aria-label="Review task"
        >
          <ArrowUp size={20} />
        </button>
      </div>
    </form>
  );
}
