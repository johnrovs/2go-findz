import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

function FaqTab({ faqs, onChange }) {
  function handleAdd() {
    onChange([...faqs, { question: '', answer: '' }]);
  }

  function handleRemove(index) {
    onChange(faqs.filter((_, i) => i !== index));
  }

  function handleFieldChange(index, field, value) {
    const next = [...faqs];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...faqs];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === faqs.length - 1) return;
    const next = [...faqs];
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
        Add FAQ
      </button>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div key={index} className="rounded-md border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">FAQ {index + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  aria-label={`Move FAQ ${index + 1} up`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === faqs.length - 1}
                  aria-label={`Move FAQ ${index + 1} down`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  aria-label={`Remove FAQ ${index + 1}`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor={`question-${index}`} className="mb-1 block text-xs font-medium text-slate-700">
                Question
              </label>
              <input
                id={`question-${index}`}
                type="text"
                value={faq.question}
                onChange={(event) => handleFieldChange(index, 'question', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor={`answer-${index}`} className="mb-1 block text-xs font-medium text-slate-700">
                Answer
              </label>
              <textarea
                id={`answer-${index}`}
                rows={3}
                value={faq.answer}
                onChange={(event) => handleFieldChange(index, 'answer', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FaqTab;
