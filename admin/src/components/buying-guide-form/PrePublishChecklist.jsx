import { Check, AlertCircle } from 'lucide-react';

function PrePublishChecklist({ items, onNavigate }) {
  return (
    <div className="rounded-card border border-border bg-white p-5">
      <h3 className="mb-4 text-card-title text-heading">Before You Publish</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onNavigate(item.step)}
              className="flex w-full items-center gap-2 rounded-btn px-2 py-1 text-left text-sm hover:bg-surface-secondary"
            >
              {item.isComplete ? (
                <Check size={16} className="shrink-0 text-success" />
              ) : (
                <AlertCircle size={16} className="shrink-0 text-warning" />
              )}
              <span className={item.isComplete ? 'text-body' : 'text-body font-medium'}>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PrePublishChecklist;
