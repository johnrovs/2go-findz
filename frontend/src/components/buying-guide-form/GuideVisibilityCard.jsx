const OPTIONS = [
  { value: 'PUBLIC', title: 'Public', description: 'Anyone can view this guide.' },
  { value: 'UNLISTED', title: 'Unlisted', description: 'Only people with the link can view this guide.' },
  { value: 'PRIVATE', title: 'Private', description: 'Only authorized administrators can view this guide.' },
];

function GuideVisibilityCard({ value, onChange }) {
  return (
    <div className="rounded-card border border-border bg-white p-5">
      <h3 className="mb-4 text-card-title text-heading">Guide Visibility</h3>
      <div role="radiogroup" aria-label="Guide Visibility" className="space-y-3">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-3 rounded-btn border p-3 ${
              value === option.value ? 'border-primary bg-primary/5' : 'border-border'
            }`}
          >
            <input
              type="radio"
              name="visibility"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-body">{option.title}</span>
              <span className="block text-xs text-muted">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default GuideVisibilityCard;
