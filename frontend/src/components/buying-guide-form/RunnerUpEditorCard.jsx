import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, ChevronUp, GripVertical, Star, Trash2 } from 'lucide-react';
import Button from '../Button.jsx';
import ConfirmDialog from '../ConfirmDialog.jsx';
import RecommendationBadgeField from './RecommendationBadgeField.jsx';
import RecommendationContentEditor from './RecommendationContentEditor.jsx';
import RecommendationListEditor from './RecommendationListEditor.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';

function RunnerUpEditorCard({ runnerUp, index, total, onChangeProduct, onRemove, onFieldChange, fieldErrors, onMoveUp, onMoveDown }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: runnerUp.clientId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const imageUrl = getImageUrl(runnerUp.product.imageFileName);

  function handleConfirmRemove() {
    onRemove(runnerUp.clientId);
    setIsRemoveConfirmOpen(false);
  }

  return (
    <li ref={setNodeRef} style={style} className="rounded-btn border border-border bg-white">
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${runnerUp.product.name}`}
          className="cursor-grab rounded-btn p-1 text-muted hover:bg-surface-secondary active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted">
          {index + 1}
        </span>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            aria-label={`Move ${runnerUp.product.name} up`}
            className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            aria-label={`Move ${runnerUp.product.name} down`}
            className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowDown size={14} />
          </button>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {runnerUp.sectionLabel || 'Untitled Badge'}
        </span>
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100">
          {imageUrl && <img src={imageUrl} alt={runnerUp.product.name} className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-body">{runnerUp.product.name}</p>
          <p className="truncate text-xs text-muted">
            {runnerUp.product.brand || '—'} · ${Number(runnerUp.product.productPrice).toFixed(2)}
            {runnerUp.product.rating != null && (
              <>
                {' '}
                · <Star size={12} className="inline fill-star text-star" /> {runnerUp.product.rating}
              </>
            )}
          </p>
          {runnerUp.product.active === false && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-warning">
              <AlertTriangle size={12} />
              This product is no longer active.
            </p>
          )}
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => onChangeProduct(runnerUp.clientId)}>
          Change Product
        </Button>
        <button
          type="button"
          onClick={() => setIsRemoveConfirmOpen(true)}
          aria-label="Remove Runner-Up"
          className="shrink-0 rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
        >
          <Trash2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => setIsExpanded((open) => !open)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse Runner-Up details' : 'Expand Runner-Up details'}
          className="shrink-0 rounded-btn p-1.5 text-muted hover:bg-surface-secondary"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4 border-t border-border p-4">
          <RecommendationBadgeField
            id={`runner-up-badge-${runnerUp.clientId}`}
            value={runnerUp.sectionLabel}
            onChange={(value) => onFieldChange(runnerUp.clientId, 'sectionLabel', value)}
            error={fieldErrors[`badge-${runnerUp.clientId}`]}
          />
          <RecommendationContentEditor
            id={`runner-up-why-${runnerUp.clientId}`}
            value={runnerUp.whyRecommended}
            onChange={(value) => onFieldChange(runnerUp.clientId, 'whyRecommended', value)}
            error={fieldErrors[`why-${runnerUp.clientId}`]}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <RecommendationListEditor
              title="Pros"
              items={runnerUp.pros}
              addLabel="Pro"
              onChange={(items) => onFieldChange(runnerUp.clientId, 'pros', items)}
              error={fieldErrors[`pros-${runnerUp.clientId}`]}
            />
            <RecommendationListEditor
              title="Cons"
              items={runnerUp.cons}
              addLabel="Con"
              onChange={(items) => onFieldChange(runnerUp.clientId, 'cons', items)}
              error={fieldErrors[`cons-${runnerUp.clientId}`]}
            />
            <RecommendationListEditor
              title="Best For"
              items={runnerUp.bestFor}
              addLabel="Item"
              onChange={(items) => onFieldChange(runnerUp.clientId, 'bestFor', items)}
              error={fieldErrors[`bestFor-${runnerUp.clientId}`]}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isRemoveConfirmOpen}
        title="Remove Runner-Up?"
        message="This removes the Runner-Up recommendation only — the product stays in Products, Quick Picks, and Comparison."
        confirmLabel="Remove"
        isDestructive
        onConfirm={handleConfirmRemove}
        onCancel={() => setIsRemoveConfirmOpen(false)}
      />
    </li>
  );
}

export default RunnerUpEditorCard;
