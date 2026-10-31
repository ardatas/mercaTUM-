import { useId, useMemo, useState, type CSSProperties } from "react";
import { ArrowDownUp, ArrowUpRight, Search, Zap } from "lucide-react";
import {
  brandNames,
  offers,
  offerBenchmark,
  benchmarkSnapshot,
  formatTokens,
  type Brand,
  type Offer,
} from "../../../shared/marketplace";
import "./marketplace.css";

export function ModelLogo({
  brand,
  className = "",
}: {
  brand: Brand;
  className?: string;
}) {
  return (
    <span className={`model-logo model-logo--${brand} ${className}`}>
      <img
        src={`/brands/${brand}.svg`}
        alt={`${brandNames[brand]} logo`}
        width="28"
        height="28"
      />
    </span>
  );
}

// Catmull–Rom cubic curves adapted from the supplied AnalyticsBento component.
function smooth(points: [number, number][]) {
  if (points.length < 2) return "";
  const at = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))];
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const a = at(i - 1),
      b = at(i),
      c = at(i + 1),
      e = at(i + 2),
      k = 0.18;
    d += `C${b[0] + (c[0] - a[0]) * k},${b[1] + (c[1] - a[1]) * k} ${c[0] - (e[0] - b[0]) * k},${c[1] - (e[1] - b[1]) * k} ${c[0]},${c[1]}`;
  }
  return d;
}

const brands = Object.keys(brandNames) as Brand[];
const number = (value: number) => value.toLocaleString("en-US");

function CapacityChart() {
  const gradient = useId();
  const totals = brands.map((brand) =>
    offers
      .filter((offer) => offer.brand === brand)
      .reduce((sum, offer) => sum + offer.remainingTokens, 0),
  );
  const maximum = Math.max(...totals);
  const points: [number, number][] = totals.map((total, index) => [
    24 + index * 47,
    93 - (total / maximum) * 72,
  ]);
  const path = smooth(points);
  return (
    <div className="mp-capacity-chart">
      <svg
        viewBox="0 0 282 115"
        preserveAspectRatio="none"
        role="img"
        aria-label="Remaining token capacity by provider"
      >
        <defs>
          <linearGradient id={gradient} x1="0" x2="1">
            <stop stopColor="#64e9de" />
            <stop offset=".5" stopColor="#b48aff" />
            <stop offset="1" stopColor="#aafa68" />
          </linearGradient>
        </defs>
        {[24, 60, 96].map((y) => (
          <line
            key={y}
            x1="8"
            x2="274"
            y1={y}
            y2={y}
            stroke="#ffffff12"
            strokeDasharray="3 5"
          />
        ))}
        <path
          d={`${path}L259,104L24,104Z`}
          fill={`url(#${gradient})`}
          opacity=".07"
        />
        <path
          d={path}
          stroke={`url(#${gradient})`}
          fill="none"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
        {points.map(([x, y], i) => (
          <line
            key={brands[i]}
            x1={x}
            x2={x + 0.01}
            y1={y}
            y2={y}
            stroke={offers.find((offer) => offer.brand === brands[i])?.color}
            strokeWidth="7"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          >
            <title>
              {brandNames[brands[i]]}: {number(totals[i])} tokens
            </title>
          </line>
        ))}
      </svg>
      <div className="mp-chart-brands">
        {brands.map((brand) => (
          <ModelLogo key={brand} brand={brand} />
        ))}
      </div>
    </div>
  );
}

function OfferCard({
  offer,
  priceSats,
  onSelect,
}: {
  offer: Offer;
  priceSats?: number;
  onSelect: (id: string) => void;
}) {
  const benchmark = offerBenchmark(offer);
  const percent = Math.round((offer.remainingTokens / offer.totalTokens) * 100);
  return (
    <button
      type="button"
      className="mp-offer"
      style={{ "--offer-color": offer.color } as CSSProperties}
      onClick={() => onSelect(offer.id)}
      aria-label={`Open ${brandNames[offer.brand]} ${offer.tier} from ${offer.seller}, ${offer.remainingTokens} tokens remaining, AA Index ${benchmark?.score ?? "unrated"} for ${offer.models[0].label}, ${benchmark?.variant ?? ""}`}
    >
      <div className="mp-offer-top">
        <ModelLogo brand={offer.brand} />
        <div className="mp-offer-title">
          <h3>{brandNames[offer.brand]}</h3>
          <span>{offer.tier}</span>
        </div>
        <ArrowUpRight size={19} className="mp-offer-arrow" />
      </div>
      <div
        className="mp-offer-model"
        title={offer.models.map((model) => model.label).join(", ")}
      >
        {offer.models[0].label}
        {offer.models.length > 1 && <span> +{offer.models.length - 1}</span>}
      </div>
      <div className="mp-offer-metrics">
        <div>
          <span className="mp-metric-label">Tokens left</span>
          <strong
            title={`${number(offer.remainingTokens)} of ${number(offer.totalTokens)} tokens`}
          >
            {formatTokens(offer.remainingTokens)}
          </strong>
        </div>
        <div className="mp-score">
          <span
            className="mp-metric-label"
            title={`${benchmarkSnapshot.name} v${benchmarkSnapshot.version}: ${offer.models[0].label}, ${benchmark?.variant ?? "unrated"}`}
          >
            AA Index
          </span>
          <strong>{benchmark?.score ?? "—"}</strong>
        </div>
      </div>
      <div
        className="mp-capacity-bar"
        role="meter"
        aria-label="Remaining token capacity"
        aria-valuenow={offer.remainingTokens}
        aria-valuemin={0}
        aria-valuemax={offer.totalTokens}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="mp-limit-note">
        <span>{percent}% available</span>
        <span>
          {offer.models.length} {offer.models.length === 1 ? "model" : "models"}
        </span>
      </div>
      <div className="mp-offer-footer">
        <span className="mp-seller">{offer.seller}</span>
        <span className="mp-offer-price">
          {priceSats === undefined ? (
            "Open chat"
          ) : (
            <>
              <b>{priceSats}</b> sats / task
            </>
          )}
        </span>
      </div>
    </button>
  );
}

export function Marketplace({
  onSelect,
  priceSats,
}: {
  onSelect: (offerId: string) => void;
  priceSats?: number;
}) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState<Brand | "all">("all");
  const [sort, setSort] = useState("featured");
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return offers
      .filter(
        (offer) =>
          (brand === "all" || offer.brand === brand) &&
          [
            brandNames[offer.brand],
            offer.tier,
            offer.seller,
            offer.tag,
            ...offer.models.map((model) => model.label),
          ]
            .join(" ")
            .toLowerCase()
            .includes(needle),
      )
      .sort((a, b) =>
        sort === "score"
          ? (offerBenchmark(b)?.score ?? -1) - (offerBenchmark(a)?.score ?? -1)
          : sort === "remaining"
            ? b.remainingTokens - a.remainingTokens
            : 0,
      );
  }, [query, brand, sort]);
  const available = offers.reduce(
    (sum, offer) => sum + offer.remainingTokens,
    0,
  );
  return (
    <section className="marketplace" aria-labelledby="marketplace-heading">
      <header className="mp-header">
        <div>
          <div className="mp-eyebrow">
            <span /> THE AI MARKETPLACE
          </div>
          <h1 id="marketplace-heading">
            Your next model is here<span>.</span>
          </h1>
          <p>Great models. Spare capacity. Yours to use.</p>
        </div>
        <div className="mp-header-label">
          <Zap size={15} />
          <span>Pay per task in sats</span>
        </div>
      </header>
      <div className="mp-overview">
        <section
          className="mp-panel mp-capacity-panel"
          aria-label="Marketplace capacity"
        >
          <div className="mp-capacity-copy">
            <span className="mp-panel-label">Demo token capacity</span>
            <div className="mp-big-number">
              {formatTokens(available)}
              <span>tokens available</span>
            </div>
            <div className="mp-summary-chips">
              <span>
                <i />
                {offers.length} offers
              </span>
              <span>{brands.length} model families</span>
            </div>
          </div>
          <CapacityChart />
        </section>
      </div>
      <div className="mp-listing-header">
        <div>
          <h2>
            Available subscriptions <span>{offers.length}</span>
          </h2>
          <p>Pick a subscription to open your workspace.</p>
        </div>
        <label className="mp-search">
          <Search size={17} />
          <span className="mp-sr-only">Search subscriptions</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search models, people…"
            type="search"
          />
        </label>
      </div>
      <div className="mp-toolbar">
        <div className="mp-filters" aria-label="Filter by model family">
          <button
            type="button"
            onClick={() => setBrand("all")}
            aria-pressed={brand === "all"}
          >
            All models
          </button>
          {brands.map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={brand === item}
              onClick={() => setBrand(item)}
            >
              <ModelLogo brand={item} />
              {brandNames[item]}
            </button>
          ))}
        </div>
        <label className="mp-sort">
          <ArrowDownUp size={14} />
          <span className="mp-sr-only">Sort subscriptions</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="featured">Featured</option>
            <option value="remaining">Most capacity</option>
            <option value="score">Highest AA Index</option>
          </select>
        </label>
      </div>
      <div className="mp-offer-grid">
        {shown.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            priceSats={priceSats}
            onSelect={onSelect}
          />
        ))}
      </div>
      {shown.length === 0 && (
        <div className="mp-empty">
          <Search size={26} />
          <h3>No matching subscriptions</h3>
          <p>Try a model name or clear your filters.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setBrand("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <details className="mp-benchmark-sources">
        <summary>
          Benchmark sources · AA Index v{benchmarkSnapshot.version}
        </summary>
        <p>
          Checked {benchmarkSnapshot.checkedAt}. Scores apply to each card’s
          first model at the variant below, not every model or effort. Higher is
          better. Capacity is demo data.
        </p>
        <ul>
          {offers
            .filter(
              (offer, index) =>
                offers.findIndex(
                  (other) => other.models[0].id === offer.models[0].id,
                ) === index,
            )
            .map((offer) => {
              const benchmark = offerBenchmark(offer);
              return (
                benchmark && (
                  <li key={offer.id}>
                    <a href={benchmark.source} target="_blank" rel="noreferrer">
                      {offer.models[0].label} · {benchmark.variant}:{" "}
                      {benchmark.score}
                    </a>
                  </li>
                )
              );
            })}
        </ul>
      </details>
      <div className="mp-bottom-note">
        <span>Choose capacity. Start a conversation.</span>
        <span>
          {shown.length} of {offers.length} offers
        </span>
      </div>
    </section>
  );
}
