import { useState, useRef } from "react";
import { Download, FileCode2, ChevronDown } from "lucide-react";
import type { Artifact } from "../../../shared/contracts";
export function ArtifactViewer({
  taskId,
  artifacts,
}: {
  taskId: string;
  artifacts: Omit<Artifact, "content">[];
}) {
  const [active, setActive] = useState<string>(),
    [content, setContent] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const view = async (id: string) => {
    const current = ++generation.current;
    if (id === active) {
      setActive(undefined);
      return;
    }
    setActive(id);
    setContent("");
    setError("");
    setBusy(true);
    try {
      const r = await fetch(`/api/tasks/${taskId}/artifacts/${id}`);
      if (!r.ok) throw new Error("Could not open this artifact.");
      const text = await r.text();
      if (current === generation.current) setContent(text);
    } catch (e) {
      if (current === generation.current) setError((e as Error).message);
    } finally {
      if (current === generation.current) setBusy(false);
    }
  };
  const lines = content.split("\n");
  return (
    <div className="artifact-viewer">
      {artifacts.map((a) => (
        <div key={a.id}>
          <div className="artifact-download">
            <button
              onClick={() => void view(a.id)}
              aria-expanded={active === a.id}
            >
              <FileCode2 size={17} />
              <span>{a.name}</span>
              <ChevronDown size={14} />
            </button>
            <a
              aria-label={`Download ${a.name}`}
              href={`/api/tasks/${taskId}/artifacts/${a.id}`}
            >
              <Download size={16} />
            </a>
          </div>
          {active === a.id && (
            <div className="artifact-preview">
              {error ? (
                <p role="alert">{error}</p>
              ) : busy ? (
                <p>Opening artifact…</p>
              ) : (
                <>
                  <pre>
                    {lines.slice(0, 2000).map((line, i) => (
                      <div
                        key={i}
                        className={
                          a.name.endsWith(".patch")
                            ? line.startsWith("+")
                              ? "diff-added"
                              : line.startsWith("-")
                                ? "diff-removed"
                                : ""
                            : ""
                        }
                      >
                        {line || " "}
                      </div>
                    ))}
                  </pre>
                  {lines.length > 2000 && (
                    <p>
                      Preview shows the first 2,000 lines. Download the full
                      artifact.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
