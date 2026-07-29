function AnalyticsCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-small font-medium text-muted">{label}</span>
        {Icon && <Icon className="h-5 w-5 text-primary" />}
      </div>
      <p className="mt-2 text-page-heading text-heading">{value}</p>
    </div>
  );
}

export default AnalyticsCard;
