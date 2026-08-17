const VARIANTS = {
  trending: 'bg-warning/10 text-warning',
  bestSeller: 'bg-success/10 text-success',
  scheduled: 'bg-info/10 text-info',
  published: 'bg-info/10 text-info',
  inactive: 'bg-surface-secondary text-muted',
};

function StatusBadge({ variant, children }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANTS[variant]}`}>{children}</span>
  );
}

export default StatusBadge;
