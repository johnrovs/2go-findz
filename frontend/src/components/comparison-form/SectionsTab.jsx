import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

function SectionsTab({ sections, onChange }) {
  function handleAdd() {
    onChange([...sections, { heading: '', body: '' }]);
  }

  function handleRemove(index) {
    onChange(sections.filter((_, i) => i !== index));
  }

  function handleFieldChange(index, field, value) {
    const next = [...sections];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...sections];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === sections.length - 1) return;
    const next = [...sections];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleAdd}
        className="mb-4 flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        <Plus size={16} />
        Add Section
      </button>

      <div className="space-y-4">
        {sections.map((section, index) => (
          <div key={index} className="rounded-md border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Section {index + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  aria-label={`Move section ${index + 1} up`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === sections.length - 1}
                  aria-label={`Move section ${index + 1} down`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  aria-label={`Remove section ${index + 1}`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor={`heading-${index}`} className="mb-1 block text-xs font-medium text-slate-700">
                Heading
              </label>
              <input
                id={`heading-${index}`}
                type="text"
                value={section.heading}
                onChange={(event) => handleFieldChange(index, 'heading', event.target.value)}
                placeholder="e.g. Buying Tips"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor={`body-${index}`} className="mb-1 block text-xs font-medium text-slate-700">
                Body
              </label>
              <textarea
                id={`body-${index}`}
                rows={4}
                value={section.body}
                onChange={(event) => handleFieldChange(index, 'body', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SectionsTab;
