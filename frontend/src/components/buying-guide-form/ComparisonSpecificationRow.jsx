import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';

function ComparisonSpecificationRow({
  spec,
  index,
  total,
  products,
  nameError,
  valueErrors,
  onNameChange,
  onValueChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: spec.clientId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const nameInputId = `comparison-spec-name-${spec.clientId}`;
  const rowLabel = spec.specificationName || 'specification';

  return (
    <li ref={setNodeRef} style={style} className="flex items-stretch gap-3">
      <div className="flex w-10 shrink-0 flex-col items-center justify-center gap-2 self-stretch rounded-btn bg-slate-50 py-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-muted shadow-sm">
          {index + 1}
        </span>
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${rowLabel}`}
          className="cursor-grab rounded-btn p-1 text-muted hover:bg-surface-secondary active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            aria-label={`Move ${rowLabel} up`}
            className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            aria-label={`Move ${rowLabel} down`}
            className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowDown size={14} />
          </button>
        </div>
      </div>

      <div className="min-w-0 flex-1 rounded-btn border border-border bg-white p-4">
        <div className="mb-3">
          <label htmlFor={nameInputId} className="mb-1 block text-small font-medium text-body">
            Specification Name
          </label>
          <input
            id={nameInputId}
            type="text"
            maxLength={100}
            value={spec.specificationName}
            onChange={(event) => onNameChange(spec.clientId, event.target.value)}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? `${nameInputId}-error` : undefined}
            className="w-full max-w-sm rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {nameError && (
            <p id={`${nameInputId}-error`} role="alert" className="mt-1 text-sm text-danger">
              {nameError}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const cell = spec.values.find((v) => v.productId === product.id);
            const cellValue = cell?.value ?? '';
            const cellError = valueErrors[product.id];
            const valueInputId = `comparison-spec-value-${spec.clientId}-${product.id}`;
            return (
              <div key={product.id}>
                <label htmlFor={valueInputId} className="mb-1 block text-xs font-medium text-muted">
                  {product.name}
                </label>
                <input
                  id={valueInputId}
                  type="text"
                  value={cellValue}
                  onChange={(event) => onValueChange(spec.clientId, product.id, event.target.value)}
                  aria-invalid={Boolean(cellError)}
                  aria-describedby={cellError ? `${valueInputId}-error` : undefined}
                  className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {cellError && (
                  <p id={`${valueInputId}-error`} role="alert" className="mt-1 text-xs text-danger">
                    {cellError}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(spec.clientId)}
        aria-label={`Delete ${rowLabel} specification`}
        className="shrink-0 self-start rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}

export default ComparisonSpecificationRow;
