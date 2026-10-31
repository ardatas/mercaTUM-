import { useId } from "react";
// Read-only adaptation of reference 6. Marketplace availability is simulated.
export function CapacityDial({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const gradientId = useId();
  const r = 44,
    c = 2 * Math.PI * r,
    arc = 0.75 * c;
  return (
    <div className="dial-wrap">
      <div
        className="glass-dial"
        role="img"
        aria-label={`${label}: ${value}% remaining, simulated`}
      >
        <svg viewBox="0 0 112 112">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(320 80% 45%)" />
              <stop offset="50%" stopColor="hsl(265 80% 50%)" />
              <stop offset="100%" stopColor="hsl(185 80% 35%)" />
            </linearGradient>
          </defs>
          <circle
            className="dial-track"
            cx="56"
            cy="56"
            r={r}
            fill="none"
            strokeWidth="4"
            strokeDasharray={`${arc} ${c}`}
            transform="rotate(135 56 56)"
          />
          <circle
            className="dial-fill"
            style={{ stroke: `url(#${gradientId})` }}
            cx="56"
            cy="56"
            r={r}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${(arc * value) / 100} ${c}`}
            transform="rotate(135 56 56)"
          />
        </svg>
        <div className="glass-cap">
          <strong>
            {value}
            <small>%</small>
          </strong>
          <span>remaining</span>
        </div>
      </div>
      <span className="dial-label">{label}</span>
    </div>
  );
}
