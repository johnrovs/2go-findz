import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, GripVertical, Trash2 } from 'lucide-react';
import RichTextEditor from './RichTextEditor.jsx';

function ContentSectionEditorCard({
  entry,
  index,
  total,
  onFieldChange,
  onToggleVisible,
  onRequestDelete,
  onMoveUp,
  onMoveDown,
  isExpanded,
  onToggleExpanded,
  titleError,
  contentError,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: entry.clientId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const label = entry.title || 'Untitled Section';
  const titleFieldId = `content-section-title-${entry.clientId}`;
  const contentFieldId = `content-section-body-${entry.clientId}`;

  return (
    <li ref={setNodeRef} style={style} className="rounded-btn border border-border bg-white">
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${label}`}
          className="cursor-grab rounded-btn p-1 text-muted hover:bg-surface-secondary active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {index + 1}
        </span>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            aria-label={`Move ${label} up`}
            className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            aria-label={`Move ${label} down`}
            className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowDown size={14} />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor={titleFieldId} className="sr-only">
            Section title
          </label>
          <input
            id={titleFieldId}
            type="text"
            maxLength={150}
            value={entry.title}
            onChange={(event) => onFieldChange(entry.clientId, 'title', event.target.value)}
            placeholder="Section title"
            aria-invalid={Boolean(titleError)}
            aria-describedby={titleError ? `${titleFieldId}-error` : undefined}
            className="w-full rounded-btn border border-border px-2 py-1.5 text-sm font-medium text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {titleError && (
            <p id={`${titleFieldId}-error`} role="alert" className="mt-1 text-xs text-danger">
              {titleError}
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={entry.visible}
          aria-label={entry.visible ? `Hide ${label} from the published guide` : `Show ${label} in the published guide`}
          onClick={() => onToggleVisible(entry.clientId)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            entry.visible ? 'bg-primary' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              entry.visible ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <button
          type="button"
          onClick={() => onRequestDelete(entry)}
          aria-label={`Delete ${label}`}
          className="shrink-0 rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
        >
          <Trash2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => onToggleExpanded(entry.clientId)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Collapse ${label}` : `Expand ${label}`}
          className="shrink-0 rounded-btn p-1.5 text-muted hover:bg-surface-secondary"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-border p-4">
          <RichTextEditor
            id={contentFieldId}
            label="Section Content"
            value={entry.content}
            onChange={(value) => onFieldChange(entry.clientId, 'content', value)}
            error={contentError}
            withImage
          />
        </div>
      )}
    </li>
  );
}

export default ContentSectionEditorCard;
