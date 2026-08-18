function scoreColor(label) {
  if (label === 'Excellent') return 'text-success';
  if (label === 'Good') return 'text-warning';
  return 'text-danger';
}

function SeoScoreCard({ score, label, checks, onViewFullAnalysis }) {
  const passedChecks = checks.filter((check) => check.points === check.maxPoints);
  return (
    <div className="rounded-card border border-border bg-white p-5">
      <h3 className="mb-4 text-card-title text-heading">SEO Score</h3>
      <div className="flex items-center gap-4">
        <div
          className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-4 border-current ${scoreColor(label)}`}
        >
          <span className="text-xl font-bold">{score}</span>
        </div>
        <div>
          <p className={`font-semibold ${scoreColor(label)}`}>{label}</p>
          <p className="text-xs text-muted">
            {passedChecks.length} of {checks.length} checks passed
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-1 text-sm">
        {checks.map((check) => (
          <li key={check.id} className="flex items-center justify-between">
            <span className={check.points === check.maxPoints ? 'text-body' : 'text-muted'}>{check.label}</span>
            <span className={check.points === check.maxPoints ? 'text-success' : 'text-muted'}>
              {check.points === check.maxPoints ? '✓' : '—'}
            </span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onViewFullAnalysis} className="mt-4 text-sm font-medium text-primary hover:underline">
        View full SEO analysis →
      </button>
    </div>
  );
}

export default SeoScoreCard;
