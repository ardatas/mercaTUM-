// Read-only adaptation of reference 6. Marketplace availability is simulated.
export function CapacityDial({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
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
