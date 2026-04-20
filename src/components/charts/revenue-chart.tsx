type RevenuePoint = {
  label: string;
  total: number;
};

interface RevenueChartProps {
  points: RevenuePoint[];
}

const CHART_WIDTH = 760;
const CHART_HEIGHT = 250;
const PADDING_LEFT = 48;
const PADDING_RIGHT = 20;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 34;

export function RevenueChart(props: RevenueChartProps) {
  if (props.points.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
        <h3 className="text-lg font-semibold">Revenue Trend</h3>
        <p className="mt-3 text-sm text-slate-400">
          Add invoices with dates to visualize monthly revenue.
        </p>
      </div>
    );
  }

  const chartInnerWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const chartInnerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const maxValue = Math.max(...props.points.map((point) => point.total), 1);
  const xStep = props.points.length > 1 ? chartInnerWidth / (props.points.length - 1) : 0;

  const coordinates = props.points.map((point, index) => {
    const x = PADDING_LEFT + (props.points.length === 1 ? chartInnerWidth / 2 : index * xStep);
    const y = PADDING_TOP + chartInnerHeight - (point.total / maxValue) * chartInnerHeight;
    return { ...point, x, y };
  });

  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${coordinates[coordinates.length - 1].x.toFixed(2)} ${(PADDING_TOP + chartInnerHeight).toFixed(2)} L ${coordinates[0].x.toFixed(2)} ${(PADDING_TOP + chartInnerHeight).toFixed(2)} Z`;

  const yTicks = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
      <h3 className="text-lg font-semibold">Revenue Trend</h3>
      <p className="mt-1 text-sm text-slate-400">Monthly totals based on invoice dates.</p>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label="Revenue trend chart"
          className="min-w-[680px]"
        >
          <defs>
            <linearGradient id="revenue-area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(34, 211, 238)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="rgb(34, 211, 238)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {yTicks.map((ratio) => {
            const y = PADDING_TOP + chartInnerHeight - ratio * chartInnerHeight;
            return (
              <g key={ratio}>
                <line
                  x1={PADDING_LEFT}
                  y1={y}
                  x2={CHART_WIDTH - PADDING_RIGHT}
                  y2={y}
                  stroke="rgba(148, 163, 184, 0.25)"
                  strokeDasharray={ratio === 0 ? undefined : "4 4"}
                />
                <text
                  x={PADDING_LEFT - 8}
                  y={y + 4}
                  fontSize="10"
                  textAnchor="end"
                  fill="rgb(148, 163, 184)"
                >
                  ${Math.round(maxValue * ratio).toLocaleString()}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#revenue-area-gradient)" />
          <path d={linePath} fill="none" stroke="rgb(34, 211, 238)" strokeWidth="3" />

          {coordinates.map((point) => (
            <g key={`${point.label}-${point.x}`}>
              <circle cx={point.x} cy={point.y} r="4.5" fill="rgb(59, 130, 246)" />
              <title>
                {point.label}: ${point.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </title>
            </g>
          ))}

          {coordinates.map((point) => (
            <text
              key={`label-${point.label}-${point.x}`}
              x={point.x}
              y={CHART_HEIGHT - 10}
              textAnchor="middle"
              fontSize="11"
              fill="rgb(148, 163, 184)"
            >
              {point.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
