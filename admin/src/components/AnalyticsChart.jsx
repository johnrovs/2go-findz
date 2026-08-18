import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import ChartTooltip from './ChartTooltip.jsx';

function AnalyticsChart({ type, data, xKey, yKey, label, layout }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-card border border-slate-200 bg-white text-sm text-slate-400">
        No data yet
      </div>
    );
  }

  return (
    <div className="rounded-card border border-slate-200 bg-white p-4 shadow-card">
      <h3 className="mb-4 text-small font-semibold text-heading">{label}</h3>
      <ResponsiveContainer width="100%" height={240}>
        {type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey={yKey} stroke="#2563EB" strokeWidth={2} dot={false} />
          </LineChart>
        ) : (
          <BarChart data={data} layout={layout === 'vertical' ? 'vertical' : 'horizontal'}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            {layout === 'vertical' ? (
              <>
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey={xKey} width={120} tick={{ fontSize: 12 }} />
              </>
            ) : (
              <>
                <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
              </>
            )}
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey={yKey} fill="#2563EB" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default AnalyticsChart;
