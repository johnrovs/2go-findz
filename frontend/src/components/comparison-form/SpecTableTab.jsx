import { Plus, Trash2 } from 'lucide-react';

const TIER_OPTIONS = ['BEST', 'GOOD', 'STANDARD'];

function SpecTableTab({ specRows, onChange, products }) {
  function handleAddRow() {
    onChange([
      ...specRows,
      {
        groupLabel: '',
        rowLabel: '',
        values: products.map((product) => ({ productId: product.productId, value: '', tier: 'STANDARD' })),
      },
    ]);
  }

  function handleRemoveRow(index) {
    onChange(specRows.filter((_, i) => i !== index));
  }

  function handleRowFieldChange(index, field, value) {
    const next = [...specRows];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  }

  function handleValueChange(rowIndex, productId, field, value) {
    const next = [...specRows];
    const row = next[rowIndex];
    const nextValues = row.values.map((v) => (v.productId === productId ? { ...v, [field]: value } : v));
    next[rowIndex] = { ...row, values: nextValues };
    onChange(next);
  }

  if (products.length === 0) {
    return <p className="text-sm text-slate-500">Add products in the Products tab before building the spec table.</p>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleAddRow}
        className="mb-4 flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        <Plus size={16} />
        Add Row
      </button>

      <div className="space-y-4">
        {specRows.map((row, rowIndex) => (
          <div key={rowIndex} className="rounded-md border border-slate-200 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`groupLabel-${rowIndex}`} className="mb-1 block text-xs font-medium text-slate-700">
                    Group Label
                  </label>
                  <input
                    id={`groupLabel-${rowIndex}`}
                    type="text"
                    value={row.groupLabel}
                    onChange={(event) => handleRowFieldChange(rowIndex, 'groupLabel', event.target.value)}
                    placeholder="e.g. Performance"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor={`rowLabel-${rowIndex}`} className="mb-1 block text-xs font-medium text-slate-700">
                    Row Label
                  </label>
                  <input
                    id={`rowLabel-${rowIndex}`}
                    type="text"
                    value={row.rowLabel}
                    onChange={(event) => handleRowFieldChange(rowIndex, 'rowLabel', event.target.value)}
                    placeholder="e.g. Battery Life"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveRow(rowIndex)}
                aria-label={`Remove row ${row.rowLabel || rowIndex + 1}`}
                className="mt-6 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {products.map((product) => {
                const value = row.values.find((v) => v.productId === product.productId) ?? {
                  value: '',
                  tier: 'STANDARD',
                };
                return (
                  <div key={product.productId} className="flex items-end gap-2">
                    <div className="flex-1">
                      <label
                        htmlFor={`value-${rowIndex}-${product.productId}`}
                        className="mb-1 block text-xs font-medium text-slate-700"
                      >
                        {product.name}
                      </label>
                      <input
                        id={`value-${rowIndex}-${product.productId}`}
                        type="text"
                        value={value.value}
                        onChange={(event) =>
                          handleValueChange(rowIndex, product.productId, 'value', event.target.value)
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <select
                      aria-label={`${product.name} tier`}
                      value={value.tier}
                      onChange={(event) => handleValueChange(rowIndex, product.productId, 'tier', event.target.value)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {TIER_OPTIONS.map((tier) => (
                        <option key={tier} value={tier}>
                          {tier}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SpecTableTab;
