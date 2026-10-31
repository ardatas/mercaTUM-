import { useId, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  ArrowUpRight,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  brandNames,
  offers,
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

const dimensions = [
  "Coding",
  "Reasoning",
  "Writing",
  "Context",
  "Speed",
  "Knowledge",
];
const brands = Object.keys(brandNames) as Brand[];
const number = (value: number) => value.toLocaleString("en-US");

function CapacityChart() {
  const gradient = useId();
  const totals = brands.map((brand) =>
    offers
      .filter((offer) => offer.brand === brand)
      .reduce((sum, offer) => sum + offer.remaining, 0),
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
        role="img"
        aria-label="Remaining message capacity by provider"
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
        />
        {points.map(([x, y], i) => (
          <circle
            key={brands[i]}
            cx={x}
            cy={y}
            r="3.5"
            fill={offers.find((offer) => offer.brand === brands[i])?.color}
          >
            <title>
              {brandNames[brands[i]]}: {number(totals[i])} messages
            </title>
          </circle>
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

function Radar({ offer }: { offer: Offer }) {
  const c = 132,
    radius = 85;
  const point = (i: number, r: number): [number, number] => [
    c + Math.cos(-Math.PI / 2 + (i * Math.PI) / 3) * r,
    c + Math.sin(-Math.PI / 2 + (i * Math.PI) / 3) * r,
  ];
  const points = offer.strengths.map((score, i) =>
    point(i, (radius * score) / 100),
  );
  // Closed cyclic cubic spline retains the exact six dimension values.
  let path = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length; i++) {
    const a = points[(i + 5) % 6],
      b = points[i],
      d = points[(i + 1) % 6],
      e = points[(i + 2) % 6],
      k = 0.12;
    path += `C${b[0] + (d[0] - a[0]) * k},${b[1] + (d[1] - a[1]) * k} ${d[0] - (e[0] - b[0]) * k},${d[1] - (e[1] - b[1]) * k} ${d[0]},${d[1]}`;
  }
  return (
    <svg
      className="mp-radar"
      viewBox="0 0 264 264"
      role="img"
      aria-label={`${brandNames[offer.brand]} ${offer.tier} capability profile: ${dimensions.map((label, i) => `${label} ${offer.strengths[i]}`).join(", ")}`}
    >
      {[0.25, 0.5, 0.75, 1].map((fraction) => (
        <circle
          key={fraction}
          cx={c}
          cy={c}
          r={radius * fraction}
          fill="none"
          stroke="#ffffff16"
        />
      ))}
      {dimensions.map((label, i) => {
        const p = point(i, radius),
          t = point(i, radius + 23);
        return (
          <g key={label}>
            <line x1={c} y1={c} x2={p[0]} y2={p[1]} stroke="#ffffff12" />
            <text
              x={t[0]}
              y={t[1]}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#aaaab0"
              fontSize="9"
            >
              {label}
            </text>
          </g>
        );
      })}
      <path
        d={`${path}Z`}
        fill={offer.color}
        fillOpacity=".09"
        stroke={offer.color}
        strokeWidth="2.5"
      />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={offer.color}>
          <title>
            {dimensions[i]}: {offer.strengths[i]}/100
          </title>
        </circle>
      ))}
      <circle cx={c} cy={c} r="24" fill="#19191c" stroke="#ffffff16" />
      <text
        x={c}
        y={c + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={offer.color}
        fontSize="20"
        fontWeight="600"
        fontFamily="ui-monospace, monospace"
      >
        {offer.score}
      </text>
    </svg>
  );
}

function OfferCard({
  offer,
  priceSats,
  onSelect,
  onInspect,
}: {
  offer: Offer;
  priceSats?: number;
  onSelect: (id: string) => void;
  onInspect: (id: string) => void;
}) {
  const percent = Math.round((offer.remaining / offer.total) * 100);
  return (
    <button
      type="button"
      className="mp-offer"
      style={{ "--offer-color": offer.color } as CSSProperties}
      onClick={() => onSelect(offer.id)}
      onMouseEnter={() => onInspect(offer.id)}
      onFocus={() => onInspect(offer.id)}
      aria-label={`Open ${brandNames[offer.brand]} ${offer.tier} from ${offer.seller}, ${offer.remaining} messages remaining, capability score ${offer.score}`}
    >
      <div className="mp-offer-top">
        <ModelLogo brand={offer.brand} />
        <span className="mp-offer-tag">{offer.tag}</span>
        <ArrowUpRight size={19} className="mp-offer-arrow" />
      </div>
      <div className="mp-offer-title">
        <h3>{brandNames[offer.brand]}</h3>
        <span>{offer.tier}</span>
      </div>
      <div className="mp-offer-model">
        {offer.models[0].label}
        {offer.models.length > 1 && <span> +{offer.models.length - 1}</span>}
      </div>
      <div className="mp-offer-metrics">
        <div>
          <span className="mp-metric-label">Messages left</span>
          <strong>
            {number(offer.remaining)}
            <small> / {number(offer.total)}</small>
          </strong>
        </div>
        <div className="mp-score">
          <span className="mp-metric-label">Capability score</span>
          <strong>
            {offer.score}
            <small> / 100</small>
          </strong>
        </div>
      </div>
      <div
        className="mp-capacity-bar"
        role="meter"
        aria-label="Remaining message capacity"
        aria-valuenow={offer.remaining}
        aria-valuemin={0}
        aria-valuemax={offer.total}
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
        <span className="mp-seller">
          <span className="mp-avatar">{offer.initials}</span>
          {offer.seller}
        </span>
        <span className="mp-offer-price">
          {priceSats === undefined ? (
            "Open chat"
          ) : (
            <>
              <b>{priceSats}</b> sats / task
            </>
          )}
          <ArrowRight size={15} />
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
  const [inspected, setInspected] = useState(offers[0].id);
  const current = offers.find((offer) => offer.id === inspected) ?? offers[0];
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
          ? b.score - a.score
          : sort === "remaining"
            ? b.remaining - a.remaining
            : 0,
      );
  }, [query, brand, sort]);
  const available = offers.reduce((sum, offer) => sum + offer.remaining, 0);
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
            <span className="mp-panel-label">Ready when you are</span>
            <div className="mp-big-number">
              {number(available)}
              <span>messages available</span>
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
        <section
          className="mp-panel mp-profile-panel"
          aria-label="Model capability comparison"
        >
          <div className="mp-profile-copy">
            <span className="mp-panel-label">
              <Sparkles size={14} /> Capability profile
            </span>
            <label className="mp-profile-select">
              <span className="mp-sr-only">Compare offer capabilities</span>
              <select
                value={inspected}
                onChange={(event) => setInspected(event.target.value)}
              >
                {offers.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {brandNames[offer.brand]} · {offer.tier}
                  </option>
                ))}
              </select>
            </label>
            <div className="mp-profile-score" style={{ color: current.color }}>
              {current.score}
              <span>/ 100</span>
            </div>
            <p>
              Explore the strengths.
              <br />
              Choose your fit.
            </p>
          </div>
          <Radar offer={current} />
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
            <option value="score">Highest score</option>
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
            onInspect={setInspected}
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
      <div className="mp-bottom-note">
        <span>Choose capacity. Start a conversation.</span>
        <span>
          {shown.length} of {offers.length} offers
        </span>
      </div>
    </section>
  );
}
