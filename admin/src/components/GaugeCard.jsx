import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

function GaugeCard({ label, value }) {
  const data = [{ value, fill: '#2563EB' }];

  return (
    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <span className="text-small font-medium text-muted">{label}</span>
      <div className="relative mx-auto mt-2 h-24 w-24">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" background={{ fill: '#E5E7EB' }} cornerRadius={999} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center text-card-title text-heading">
          {value}%
        </div>
      </div>
    </div>
  );
}

export default GaugeCard;
