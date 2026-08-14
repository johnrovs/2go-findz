function DashboardKpiCard({ label, value, icon: Icon, iconColorClass, changePercent, comparisonLabel }) {
  const hasChange = changePercent !== null && changePercent !== undefined;
  const isPositive = hasChange && changePercent >= 0;

  return (
    <div className="flex h-full flex-col rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[13px] font-semibold text-muted" title={label}>
          {label}
        </span>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconColorClass}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-3 text-[24px] font-bold leading-tight text-heading">{value}</p>
      {hasChange && (
        <p className={`mt-3 text-[12px] font-semibold ${isPositive ? 'text-dashboard-green' : 'text-danger'}`}>
          {isPositive ? '↑' : '↓'} {Math.abs(changePercent)}%
        </p>
      )}
      {comparisonLabel && <p className="mt-1 text-[11px] font-normal text-muted">{comparisonLabel}</p>}
    </div>
  );
}

export default DashboardKpiCard;
