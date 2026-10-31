import { useState } from "react";
import { ArrowRight, Wallet } from "lucide-react";
import type { PublicQuote as Quote } from "../../../shared/contracts";
import {
  findSelection,
  type MarketplaceSelection,
} from "../../../shared/marketplace";

export function QuoteReview({
  onRefresh,
  quote: q,
  selection,
  busy,
  onApprove,
  onCancel,
}: {
  quote: Quote;
  selection?: MarketplaceSelection;
  busy: boolean;
  onApprove: (q: Quote, max: number) => void;
  onRefresh: () => void;
  onCancel: () => void;
}) {
  const [max, setMax] = useState(Math.max(5000, q.priceSats)),
    [confirmed, setConfirmed] = useState(false);
  const selected = selection && findSelection(selection);
  const model = selected?.model;
  const differs = model && model.id !== q.modelId;
  const expired = Date.parse(q.expiresAt) < Date.now();
  return (
    <section className="quote-review">
      <div className="quote-heading">
        <Wallet size={21} />
        <h2>Review this purchase</h2>
        <span className="badge">Fixed price</span>
      </div>
      <p>{q.scopeSummary}</p>
      <dl>
        <dt>Deliverable</dt>
        <dd>{q.intendedDeliverable}</dd>
        <dt>{differs ? "Chat model" : "Model"}</dt>
        <dd>
          {model?.label ?? q.modelId}
          {selected && (
            <span className="quote-model-effort"> · {selection?.effort}</span>
          )}
        </dd>
        {differs && (
          <>
            <dt>Runs on</dt>
            <dd>
              {q.modelId}{" "}
              <span className="quote-model-effort">(demo provider)</span>
            </dd>
          </>
        )}
        <dt>Service price</dt>
        <dd>
          <strong>{q.priceSats} sats</strong>
        </dd>
        <dt>Network</dt>
        <dd>{q.network}</dd>
        <dt>Provider recipient</dt>
        <dd className="mono break">{q.recipientIdentityKey}</dd>
        <dt>Execution limits</dt>
        <dd>
          {q.limits.maxOutputTokens.toLocaleString()} output tokens / call ·{" "}
          {q.limits.maxModelCalls} paid calls including recovery ·{" "}
          {q.limits.maxTotalOutputTokens.toLocaleString()} aggregate output
          tokens · {q.limits.maxRuntimeSeconds}s per attempt ·{" "}
          {q.limits.maxRecoveryAttempts} recovery attempt ·{" "}
          {q.limits.maxContextBytes.toLocaleString()} context bytes
        </dd>
        <dt>Expires</dt>
        <dd>{new Date(q.expiresAt).toLocaleString()}</dd>
      </dl>
      <details className="quote-terms">
        <summary>
          Purchase terms · recovery included · no automatic refunds
        </summary>
        <p>{q.limitPolicy}</p>
      </details>
      <label className="debit-field">
        Spending cap (including fee){" "}
        <input
          type="number"
          min={q.priceSats}
          max={1000000}
          aria-describedby="debit-help"
          value={max}
          onChange={(e) => setMax(Number(e.target.value))}
        />
        <span>sats</span>
      </label>
      <p className="quote-debit-help" id="debit-help">
        A cap, not a fee estimate. Spending above it is blocked. Confirm the
        final amount in your wallet.
      </p>
      <label className="consent">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span>I approve these purchase terms and spending cap.</span>
      </label>
      <div className="quote-actions">
        {expired && (
          <button className="button" disabled={busy} onClick={onRefresh}>
            Refresh quote
          </button>
        )}
        <button className="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          className="button primary"
          disabled={
            busy ||
            !confirmed ||
            expired ||
            !Number.isSafeInteger(max) ||
            max < q.priceSats ||
            max > 1000000
          }
          onClick={() => onApprove(q, max)}
        >
          {expired ? "Quote expired" : `Approve ${q.priceSats} sats + fee`}
          <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}
