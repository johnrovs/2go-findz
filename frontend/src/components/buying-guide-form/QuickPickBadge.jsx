const BADGE_COLORS = [
  'bg-success text-white',
  'bg-info text-white',
  'bg-primary text-white',
  'bg-warning text-white',
  'bg-danger text-white',
];

function QuickPickBadge({ label, index }) {
  const colorClasses = BADGE_COLORS[index % BADGE_COLORS.length];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colorClasses}`}>
      {label}
    </span>
  );
}

export default QuickPickBadge;
