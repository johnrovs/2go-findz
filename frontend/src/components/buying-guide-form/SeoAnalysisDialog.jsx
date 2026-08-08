import Modal from '../Modal.jsx';

function groupChecks(checks) {
  return {
    errors: checks.filter((check) => check.points === 0),
    warnings: checks.filter((check) => check.points > 0 && check.points < check.maxPoints),
    passed: checks.filter((check) => check.points === check.maxPoints),
  };
}

function CheckList({ title, items, onFocusField, onClose }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-4">
      <h4 className="mb-2 text-sm font-semibold text-heading">{title}</h4>
      <ul className="space-y-2">
        {items.map((check) => (
          <li key={check.id} className="rounded-btn bg-surface-secondary p-3 text-sm">
            <p className="font-medium text-body">{check.label}</p>
            <p className="text-muted">{check.why}</p>
            <p className="text-body">{check.recommendation}</p>
            <button
              type="button"
              onClick={() => {
                onFocusField(check.focusStep, check.focusFieldId);
                onClose();
              }}
              className="mt-1 text-primary hover:underline"
            >
              Go to this field
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SeoAnalysisDialog({ isOpen, onClose, checks, onFocusField }) {
  if (!isOpen) return null;
  const { errors, warnings, passed } = groupChecks(checks);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Full SEO Analysis">
      <CheckList title="Errors" items={errors} onFocusField={onFocusField} onClose={onClose} />
      <CheckList title="Warnings" items={warnings} onFocusField={onFocusField} onClose={onClose} />
      <CheckList title="Passed" items={passed} onFocusField={onFocusField} onClose={onClose} />
    </Modal>
  );
}

export default SeoAnalysisDialog;
