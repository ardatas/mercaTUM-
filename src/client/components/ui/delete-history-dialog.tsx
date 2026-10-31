import { useEffect, useRef } from "react";

export function DeleteHistoryDialog({
  prompt,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  prompt: string;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="delete-history-dialog"
      aria-labelledby="delete-history-title"
      aria-describedby="delete-history-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id="delete-history-title">Delete from history?</h2>
      <p className="delete-history-prompt">{prompt}</p>
      <p id="delete-history-description">
        This removes the task from your history and recent tasks. Active work
        continues. Payment records and direct task links are retained.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="delete-history-actions">
        <button
          className="button secondary"
          disabled={busy}
          onClick={onCancel}
          autoFocus
        >
          Cancel
        </button>
        <button className="button" disabled={busy} onClick={onConfirm}>
          {busy ? "Deleting…" : "Delete from history"}
        </button>
      </div>
    </dialog>
  );
}
