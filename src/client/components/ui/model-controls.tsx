import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Zap, X } from "lucide-react";
import {
  findSelection,
  type MarketplaceSelection,
} from "../../../shared/marketplace";
export function ModelControls({
  selection,
  onChange,
  disabled,
}: {
  selection: MarketplaceSelection;
  onChange: (v: MarketplaceSelection) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState<"model" | "effort" | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const chosen = findSelection(selection)!;
  const title = (s: string) =>
    ({ xhigh: "Extra high", max: "Maximum", none: "Instant", off: "Instant" })[
      s
    ] ?? s.charAt(0).toUpperCase() + s.slice(1);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(null);
        root.current
          ?.querySelector<HTMLButtonElement>(`[data-control="${open}"]`)
          ?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  useEffect(() => {
    if (disabled) setOpen(null);
  }, [disabled]);
  return (
    <div className="model-controls" ref={root}>
      <button
        type="button"
        data-control="model"
        disabled={disabled}
        aria-expanded={open === "model"}
        onClick={() => setOpen(open === "model" ? null : "model")}
        className="model-trigger"
      >
        {chosen.model.label}
        <ChevronDown size={13} />
      </button>
      <button
        type="button"
        data-control="effort"
        disabled={disabled}
        aria-expanded={open === "effort"}
        aria-label={`Reasoning effort: ${title(selection.effort)}`}
        onClick={() => setOpen(open === "effort" ? null : "effort")}
        className="effort-trigger"
      >
        <Zap size={13} />
        {title(selection.effort)}
        <ChevronDown size={12} />
      </button>
      {open && (
        <section
          className="model-popover"
          aria-label={open === "model" ? "Select model" : "Select effort"}
        >
          <div className="model-popover-heading">
            <span>
              {open === "model" ? "Select model" : "Reasoning effort"}
            </span>
            <button
              type="button"
              aria-label="Close model controls"
              onClick={() => setOpen(null)}
            >
              <X size={15} />
            </button>
          </div>
          {open === "model" ? (
            chosen.offer.models.map((model) => (
              <button
                type="button"
                key={model.id}
                aria-pressed={selection.modelId === model.id}
                className="model-option"
                onClick={() => {
                  onChange({
                    ...selection,
                    modelId: model.id,
                    effort: model.efforts.includes(selection.effort)
                      ? selection.effort
                      : model.efforts[0],
                  });
                  setOpen(null);
                }}
              >
                <span>{model.label}</span>
                {selection.modelId === model.id && <Check size={17} />}
              </button>
            ))
          ) : (
            <>
              <strong className="effort-value">
                {title(selection.effort)}
              </strong>
              <p>{chosen.model.label}</p>
              <input
                type="range"
                aria-label="Reasoning effort"
                min={0}
                max={chosen.model.efforts.length - 1}
                step={1}
                value={chosen.model.efforts.indexOf(selection.effort)}
                onChange={(e) =>
                  onChange({
                    ...selection,
                    effort: chosen.model.efforts[Number(e.target.value)],
                  })
                }
              />
              <div className="effort-stops">
                {chosen.model.efforts.map((effort) => (
                  <button
                    key={effort}
                    type="button"
                    aria-pressed={effort === selection.effort}
                    onClick={() => onChange({ ...selection, effort })}
                  >
                    {title(effort)}
                  </button>
                ))}
              </div>
              <small>More thinking within the same quoted limits.</small>
            </>
          )}
        </section>
      )}
    </div>
  );
}
