type ExpensePoint = {
  date: string;
  total: number;
};

interface ExpensesChartProps {
  points: ExpensePoint[];
}

function formatExpenseDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function ExpensesChart(props: ExpensesChartProps) {
  if (props.points.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
        <h3 className="text-lg font-semibold">Expenses by Date</h3>
        <p className="mt-2 text-sm text-slate-400">
          Add vouchers with payment dates to visualize expenses.
        </p>
      </div>
    );
  }

  const sortedPoints = [...props.points].sort((a, b) => {
    const firstDate = new Date(a.date).getTime();
    const secondDate = new Date(b.date).getTime();

    if (Number.isNaN(firstDate) || Number.isNaN(secondDate)) {
      return a.date.localeCompare(b.date);
    }

    return firstDate - secondDate;
  });

  const maxTotal = Math.max(...sortedPoints.map((point) => point.total), 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
      <h3 className="text-lg font-semibold">Expenses by Date</h3>
      <p className="mt-1 text-sm text-slate-400">Grouped by voucher payment date.</p>

      <div className="mt-4 space-y-4">
        {sortedPoints.map((point) => {
          const widthPercent = Math.max((point.total / maxTotal) * 100, 2);
          return (
            <div key={point.date} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">
                  {formatExpenseDate(point.date)}
                </span>
                <span className="text-sm font-semibold text-slate-100">
                  ${point.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-800/90">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-rose-400 to-orange-400"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{point.date}</span>
                <span>{widthPercent.toFixed(0)}% of peak</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
