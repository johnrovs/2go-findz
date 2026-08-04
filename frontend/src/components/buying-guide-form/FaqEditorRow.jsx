import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, GripVertical, Trash2 } from 'lucide-react';

const QUESTION_MAX_LENGTH = 300;

function wordCount(text) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function FaqEditorRow({
  faq,
  index,
  total,
  onFieldChange,
  onRequestDelete,
  onMoveUp,
  onMoveDown,
  isExpanded,
  onToggleExpanded,
  questionError,
  answerError,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: faq.clientId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const label = faq.question || 'Untitled question';
  const questionFieldId = `faq-question-${faq.clientId}`;
  const answerFieldId = `faq-answer-${faq.clientId}`;

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
          <label htmlFor={questionFieldId} className="sr-only">
            Question
          </label>
          <input
            id={questionFieldId}
            type="text"
            maxLength={QUESTION_MAX_LENGTH}
            value={faq.question}
            onChange={(event) => onFieldChange(faq.clientId, 'question', event.target.value)}
            placeholder="Question"
            aria-invalid={Boolean(questionError)}
            aria-describedby={questionError ? `${questionFieldId}-error` : undefined}
            className="w-full rounded-btn border border-border px-2 py-1.5 text-sm font-medium text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="mt-1 flex items-center justify-between gap-2">
            {questionError ? (
              <p id={`${questionFieldId}-error`} role="alert" className="text-xs text-danger">
                {questionError}
              </p>
            ) : (
              <span />
            )}
            <span className="shrink-0 text-xs text-muted">
              {faq.question.length} / {QUESTION_MAX_LENGTH}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRequestDelete(faq)}
          aria-label={`Delete ${label}`}
          className="shrink-0 rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
        >
          <Trash2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => onToggleExpanded(faq.clientId)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Collapse ${label}` : `Expand ${label}`}
          className="shrink-0 rounded-btn p-1.5 text-muted hover:bg-surface-secondary"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-border p-4">
          <label htmlFor={answerFieldId} className="mb-1 block text-small font-medium text-body">
            Answer
          </label>
          <textarea
            id={answerFieldId}
            rows={4}
            value={faq.answer}
            onChange={(event) => onFieldChange(faq.clientId, 'answer', event.target.value)}
            aria-invalid={Boolean(answerError)}
            aria-describedby={answerError ? `${answerFieldId}-error` : undefined}
            className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-right text-sm text-muted">Words: {wordCount(faq.answer)}</p>
          {answerError && (
            <p id={`${answerFieldId}-error`} role="alert" className="mt-1 text-sm text-danger">
              {answerError}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export default FaqEditorRow;
