import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import ChartTooltip from './ChartTooltip.jsx';

function formatYAxisTick(value) {
  if (value >= 1000) {
    const inThousands = value / 1000;
    return `${Number.isInteger(inThousands) ? inThousands : inThousands.toFixed(1)}K`;
  }
  return value;
}

function DashboardLineChart({ data, xKey, series, label, headerAction }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-card border border-slate-200 bg-white text-sm text-slate-400">
        No data yet
      </div>
    );
  }

  const [primary] = series;

  return (
    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-card-title text-heading">{label}</h3>
        {headerAction}
      </div>
      <div className="mb-4 flex items-center gap-4">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-small text-body">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9edf3" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: '#526078' }} />
          <YAxis tick={{ fontSize: 12, fill: '#526078' }} tickFormatter={formatYAxisTick} />
          <Tooltip content={<ChartTooltip />} />
          {primary && (
            <Area
              type="monotone"
              dataKey={primary.key}
              name={primary.name}
              stroke="none"
              fill={primary.color}
              fillOpacity={0.12}
              isAnimationActive={false}
              legendType="none"
            />
          )}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 4, fill: s.color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DashboardLineChart;
