function RecommendationBadgeField({ id, value, onChange, error }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-small font-medium text-body">
        Recommendation Badge
      </label>
      <input
        id={id}
        type="text"
        maxLength={100}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. Best Overall, Best Budget Alternative"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="w-full max-w-sm rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default RecommendationBadgeField;
