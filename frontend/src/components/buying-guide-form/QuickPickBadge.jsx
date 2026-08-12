const BADGE_COLORS = [
  'bg-success text-white',
  'bg-info text-white',
  'bg-purple-600 text-white',
  'bg-warning text-white',
  'bg-danger text-white',
];

function QuickPickBadge({ label, index, className = '' }) {
  const colorClasses = BADGE_COLORS[index % BADGE_COLORS.length];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colorClasses} ${className}`}>
      {label}
    </span>
  );
}

export default QuickPickBadge;
