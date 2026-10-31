import { useState } from "react";
import {
  FileCode2,
  FolderOpen,
  GitBranch,
  Check,
  ArrowRight,
} from "lucide-react";
import { ContextActions, ActionMenu } from "./context-menu";
import { api } from "../../api";
import type { RepositorySnapshot } from "../../../shared/contracts";
export function FileViewer({
  snapshot,
  onConsent,
  onError,
}: {
  snapshot: RepositorySnapshot;
  onConsent: (s: RepositorySnapshot) => void;
  onError: (s: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>(snapshot.selectedPaths);
  const [active, setActive] = useState(snapshot.files[0]?.path);
  const [busy, setBusy] = useState(false);
  const file = snapshot.files.find((f) => f.path === active);
  const locked = !!snapshot.consentedAt;
  const toggle = (path: string) => {
    if (!locked)
      setSelected((a) =>
        a.includes(path) ? a.filter((p) => p !== path) : [...a, path],
      );
  };
  const save = async () => {
    setBusy(true);
    try {
      await api(`/api/repositories/${snapshot.id}/context`, {
        selectedPaths: selected,
        consent: true,
      });
      onConsent(await api(`/api/repositories/${snapshot.id}`));
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="file-viewer">
      <header>
        <FolderOpen size={17} />
        <strong>
          {snapshot.owner}/{snapshot.repository}
        </strong>
        <span className="revision">
          <GitBranch size={13} />
          {snapshot.commitSha.slice(0, 8)}
        </span>
      </header>
      <div className="file-layout">
        <nav aria-label="Repository files">
          <div className="section-label">
            CONTEXT FILES{" "}
            <span>
              {selected.length}/{snapshot.files.length}
            </span>
          </div>
          {snapshot.files.map((f) => {
            const actions = [
              { label: "View file", run: () => setActive(f.path) },
              {
                label: "Copy path",
                run: () => {
                  void navigator.clipboard.writeText(f.path);
                },
              },
              {
                label: selected.includes(f.path)
                  ? "Remove from context"
                  : "Include in context",
                disabled: locked,
                run: () => toggle(f.path),
              },
            ];
            return (
              <ContextActions key={f.path} actions={actions}>
                <div
                  className={`file-row ${active === f.path ? "active" : ""}`}
                >
                  <input
                    type="checkbox"
                    aria-label={`Include ${f.path}`}
                    checked={selected.includes(f.path)}
                    disabled={locked}
                    onChange={() => toggle(f.path)}
                  />
                  <button onClick={() => setActive(f.path)}>
                    <FileCode2 size={14} />
                    <span>{f.path}</span>
                  </button>
                  <ActionMenu
                    actions={actions}
                    label={`Actions for ${f.path}`}
                  />
                </div>
              </ContextActions>
            );
          })}
        </nav>
        <div className="source-pane">
          <div className="source-title">
            {file?.path ?? "No eligible files"}
            <span>Read only</span>
          </div>
          <pre>
            {file?.content.split("\n").map((line, i) => (
              <div key={i}>
                <span className="line-number">{i + 1}</span>
                <code>{line || " "}</code>
              </div>
            ))}
          </pre>
        </div>
      </div>
      <footer>
        <span>
          {locked ? (
            <>
              <Check size={14} />
              Context approved
            </>
          ) : (
            `${selected.length} selected · ${snapshot.files
              .filter((f) => selected.includes(f.path))
              .reduce((s, f) => s + f.bytes, 0)
              .toLocaleString()} bytes`
          )}
        </span>
        {!locked && (
          <button
            className="button primary"
            disabled={busy || selected.length === 0}
            onClick={save}
          >
            Allow selected files to be sent to the model{" "}
            <ArrowRight size={14} />
          </button>
        )}
      </footer>
      {snapshot.excluded.length > 0 && (
        <details className="excluded">
          <summary>{snapshot.excluded.length} excluded paths</summary>
          <p>{snapshot.excluded.join(", ")}</p>
        </details>
      )}
    </section>
  );
}
