// AeroNexus Admin Panel — lightweight SVG charts (no chart library dependency).


export interface ChartDatum {
  label: string;
  value: number;
  color?: string;
}

const PALETTE = ['#38bdf8', '#22d3ee', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#94a3b8'];

export function DonutChart({
  data,
  size = 180,
  thickness = 26,
  centerLabel,
}: {
  data: ChartDatum[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(30,51,85,0.6)" strokeWidth={thickness} />
        {total > 0 &&
          data.map((d, i) => {
            const frac = d.value / total;
            const len = frac * circumference;
            const el = (
              <circle
                key={`${d.label}-${i}`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color || PALETTE[i % PALETTE.length]}
                strokeWidth={thickness}
                strokeDasharray={`${Math.max(0, len - 1.5)} ${circumference - Math.max(0, len - 1.5)}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += len;
            return el;
          })}
        <text x="50%" y="47%" textAnchor="middle" fill="#e8eef8" fontSize="26" fontWeight="800">
          {total}
        </text>
        <text x="50%" y="60%" textAnchor="middle" fill="#8fa3c2" fontSize="11">
          {centerLabel || 'Total'}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
        {data.map((d, i) => (
          <div key={`${d.label}-${i}`} className="row-between" style={{ gap: 10 }}>
            <span className="row" style={{ gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color || PALETTE[i % PALETTE.length], display: 'inline-block' }} />
              <span className="small muted" style={{ textTransform: 'capitalize' }}>{d.label}</span>
            </span>
            <span className="small" style={{ fontWeight: 700 }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarChart({
  data,
  height = 180,
}: {
  data: ChartDatum[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 46;
  const gap = 18;
  const width = Math.max(280, data.length * (barWidth + gap));

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (height - 42);
          const x = i * (barWidth + gap) + 8;
          const y = height - 22 - barHeight;
          return (
            <g key={`${d.label}-${i}`}>
              <rect x={x} y={y} width={barWidth} height={Math.max(2, barHeight)} rx={5} fill={d.color || PALETTE[i % PALETTE.length]} />
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fill="#e8eef8" fontSize="11" fontWeight="700">
                {d.value}
              </text>
              <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" fill="#8fa3c2" fontSize="10">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
