import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, ArrowDown, ArrowUp, ExternalLink, GripVertical, Star, Trash2 } from 'lucide-react';
import QuickPickBadge from './QuickPickBadge.jsx';
import { isSupportedAmazonUrl } from '../../utils/amazonLink.js';
import { getImageUrl } from '../../utils/imageUrl.js';

function QuickPickEditorRow({ quickPick, index, total, error, onBadgeNameChange, onMoveUp, onMoveDown, onRemove }) {
  const { product, badgeName } = quickPick;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const imageUrl = getImageUrl(product.imageFileName);
  const isAmazonLinkSupported = isSupportedAmazonUrl(product.productLink);
  const inputId = `quick-pick-badge-name-${product.id}`;

  return (
    <li ref={setNodeRef} style={style} className="rounded-btn border border-border bg-white p-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted">
            {index + 1}
          </span>
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${product.name}`}
            className="cursor-grab rounded-btn p-1 text-muted hover:bg-surface-secondary active:cursor-grabbing"
          >
            <GripVertical size={16} />
          </button>
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              aria-label={`Move ${product.name} up`}
              className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => onMoveDown(index)}
              disabled={index === total - 1}
              aria-label={`Move ${product.name} down`}
              className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowDown size={14} />
            </button>
          </div>
        </div>

        <div className="min-w-[160px] shrink-0">
          <QuickPickBadge label={badgeName || 'Untitled Badge'} index={index} />
          <div className="mt-2 h-20 w-20 overflow-hidden rounded-md bg-slate-100">
            {imageUrl && <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />}
          </div>
        </div>

        <div className="min-w-[180px] flex-1">
          <p className="font-medium text-body">{product.name}</p>
          {product.brand && <p className="text-sm text-muted">{product.brand}</p>}
          <p className="mt-1 font-semibold text-heading">${Number(product.productPrice).toFixed(2)}</p>
          {product.rating != null && (
            <p className="mt-1 flex items-center gap-1 text-sm text-body">
              <Star size={14} className="fill-star text-star" />
              {product.rating}
              <span className="text-muted">({product.reviewCount?.toLocaleString() ?? 0})</span>
            </p>
          )}
          <div className="mt-2 flex items-center gap-1 text-sm">
            <a
              href={product.productLink}
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
              aria-label={`Open Amazon link for ${product.name}`}
              className="inline-flex items-center gap-1 truncate text-primary hover:underline"
            >
              <ExternalLink size={14} />
              <span className="truncate">{product.productLink}</span>
            </a>
          </div>
          {!isAmazonLinkSupported && (
            <p className="mt-1 flex items-center gap-1 text-xs text-warning">
              <AlertTriangle size={14} />
              Not a recognized Amazon link.
            </p>
          )}
        </div>

        <div className="min-w-[220px] flex-1">
          <label htmlFor={inputId} className="mb-1 block text-small font-medium text-body">
            Badge Name
          </label>
          <input
            id={inputId}
            type="text"
            maxLength={30}
            value={badgeName}
            onChange={(event) => onBadgeNameChange(product.id, event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-muted">Example: Best Overall, Best Battery Life, etc.</p>
          {error && (
            <p id={`${inputId}-error`} role="alert" className="mt-1 text-sm text-danger">
              {error}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRemove(product.id)}
          aria-label={`Remove ${product.name} from Quick Picks`}
          className="shrink-0 rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}

export default QuickPickEditorRow;
