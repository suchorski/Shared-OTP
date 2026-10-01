"use client";

export function CountdownRing({ remaining, period, size = 36 }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fraction = Math.max(0, Math.min(1, remaining / period));
  const color = remaining <= 5 ? "#b91c1c" : "#1e3a8a";

  return (
    <svg width={size} height={size} className="shrink-0" aria-label={`${remaining}s restantes`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - fraction)}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size / 3} fill={color} fontWeight="600">
        {remaining}
      </text>
    </svg>
  );
}
