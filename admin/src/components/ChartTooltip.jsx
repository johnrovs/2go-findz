function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  // A chart can contribute more than one graphical element for the same
  // dataKey (e.g. DashboardLineChart layers an invisible Area under a Line
  // for the same series, for the shaded-fill effect) — recharts includes
  // every element's entry in the tooltip payload, so dedupe by dataKey to
  // show each series once.
  const seen = new Set();
  const uniqueEntries = payload.filter((entry) => {
    if (seen.has(entry.dataKey)) return false;
    seen.add(entry.dataKey);
    return true;
  });

  return (
    <div className="rounded-card bg-white p-2 text-small shadow-dropdown">
      {label && <p className="mb-1 font-medium text-heading">{label}</p>}
      {uniqueEntries.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export default ChartTooltip;
