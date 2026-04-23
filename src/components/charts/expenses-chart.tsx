export type BarChartPoint = {
  label: string;
  value: number;
  valueLabel?: string;
};

export interface BarChartProps {
  points: BarChartPoint[];
  title?: string;
  description?: string;
  emptyMessage?: string;
  valueFormatter?: (value: number, point: BarChartPoint) => string;
  showZeroValues?: boolean;
}

export function BarChart(props: BarChartProps) {
  const visiblePoints = props.showZeroValues ? props.points : props.points.filter((point) => point.value > 0);
  const title = props.title ?? "Expenses";
  const description = props.description ?? "Grouped totals.";
  const emptyMessage = props.emptyMessage ?? "No data available yet.";

  if (visiblePoints.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  const maxValue = Math.max(...visiblePoints.map((point) => point.value), 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{description}</p>

      <div className="mt-4 space-y-3">
        {visiblePoints.map((point) => {
          const widthPercent = (point.value / maxValue) * 100;
          const isZeroValue = point.value <= 0;
          const valueText =
            point.valueLabel ??
            props.valueFormatter?.(point.value, point) ??
            point.value.toLocaleString(undefined, { maximumFractionDigits: 2 });

          return (
            <div
              key={point.label}
              className="grid grid-cols-[minmax(130px,220px)_minmax(0,1fr)_minmax(96px,120px)] items-center gap-3"
            >
              <span className="truncate text-xs text-slate-300" title={point.label}>
                {point.label}
              </span>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800/90">
                <div
                  className={
                    isZeroValue
                      ? "h-3 rounded-full bg-cyan-300/90"
                      : "h-3 rounded-full bg-gradient-to-r from-rose-400 to-orange-400"
                  }
                  style={{
                    width: isZeroValue && props.showZeroValues
                      ? "10px"
                      : `${Math.max(widthPercent, 0)}%`,
                  }}
                />
              </div>
              <span className="justify-self-end text-right text-xs font-semibold tabular-nums text-slate-200">
                {valueText}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface ExpensesChartProps
  extends Omit<BarChartProps, "valueFormatter"> {}

export function ExpensesChart(props: ExpensesChartProps) {
  return (
    <BarChart
      {...props}
      valueFormatter={(value) =>
        `$${value.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}`
      }
    />
  );
}
