import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronUp, HelpCircle, Info, Plus } from 'lucide-react';
import Button from '../Button.jsx';
import EmptyState from '../EmptyState.jsx';
import FaqEditorRow from './FaqEditorRow.jsx';
import DeleteFaqDialog from './DeleteFaqDialog.jsx';
import { buildFaqJsonLd } from '../../utils/faqJsonLd.js';

const HOW_IT_WORKS_POINTS = [
  'Each FAQ has one question and one answer.',
  'FAQs appear in the published guide in the order shown here.',
  'Reordering the editor changes the published order.',
  'Questions should address genuine reader concerns; answers should be accurate and concise.',
  'Changes update the Live Preview immediately.',
  'Every saved FAQ is included in the structured data preview below.',
];

const MAX_FAQS = 20;
const RECOMMENDED_MIN_FAQS = 5;

let faqCounter = 0;
function nextFaqClientId() {
  faqCounter += 1;
  return `new-faq-${faqCounter}`;
}

function BuyingGuideFaqsStep({ faqs, onChange, fieldErrors }) {
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isStructuredDataOpen, setIsStructuredDataOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [autoFocusId, setAutoFocusId] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  // Adjusting state during render (see BuyingGuideContentStep.jsx for the full rationale):
  // the null sentinel ensures this fires correctly whether errors appear on a later render
  // or the component mounts with them already present.
  const [syncedFieldErrors, setSyncedFieldErrors] = useState(null);
  if (fieldErrors !== syncedFieldErrors) {
    setSyncedFieldErrors(fieldErrors);
    const firstInvalid = faqs.find((faq) => fieldErrors[`question-${faq.clientId}`] || fieldErrors[`answer-${faq.clientId}`]);
    if (firstInvalid) {
      setExpandedIds((prev) => new Set(prev).add(firstInvalid.clientId));
    }
  }

  function toggleExpanded(clientId) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  }

  function handleAdd() {
    const newFaq = { clientId: nextFaqClientId(), question: '', answer: '' };
    onChange([...faqs, newFaq]);
    setExpandedIds((prev) => new Set(prev).add(newFaq.clientId));
    setAutoFocusId(newFaq.clientId);
  }

  function handleFieldChange(clientId, field, value) {
    onChange(faqs.map((faq) => (faq.clientId === clientId ? { ...faq, [field]: value } : faq)));
  }

  function handleRequestDelete(faq) {
    if (faq.question.trim() || faq.answer.trim()) {
      setDeleteTarget(faq);
    } else {
      onChange(faqs.filter((f) => f.clientId !== faq.clientId));
    }
  }

  function handleConfirmDelete() {
    onChange(faqs.filter((f) => f.clientId !== deleteTarget.clientId));
    setDeleteTarget(null);
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

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = faqs.findIndex((faq) => faq.clientId === active.id);
    const newIndex = faqs.findIndex((faq) => faq.clientId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...faqs];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onChange(next);
  }

  const atMax = faqs.length >= MAX_FAQS;
  const jsonLd = buildFaqJsonLd(faqs);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-card-title text-heading">FAQs</h2>
          <button
            type="button"
            aria-expanded={isHowItWorksOpen}
            aria-controls="faqs-how-it-works"
            onClick={() => setIsHowItWorksOpen((open) => !open)}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <HelpCircle size={14} />
            How it works
          </button>
        </div>
        <Button type="button" size="sm" onClick={handleAdd} disabled={atMax}>
          <Plus size={16} />
          Add FAQ
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted">
        Add frequently asked questions to help readers make confident buying decisions.
      </p>

      {isHowItWorksOpen && (
        <ul
          id="faqs-how-it-works"
          className="mb-4 list-disc space-y-1 rounded-btn bg-surface-secondary p-4 pl-8 text-sm text-body"
        >
          {HOW_IT_WORKS_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}

      {atMax && (
        <p className="mb-4 text-sm text-muted">You've reached the maximum of {MAX_FAQS} FAQs. Remove one to add another.</p>
      )}

      {faqs.length === 0 ? (
        <>
          <EmptyState
            title="No FAQs added yet"
            description="Add questions your readers are likely to ask, along with clear, accurate answers."
          />
          <div className="mt-4 flex justify-center">
            <Button type="button" onClick={handleAdd}>
              <Plus size={16} />
              Add Your First FAQ
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-card border border-border bg-white p-5">
          <h3 className="text-card-title text-heading">Frequently Asked Questions ({faqs.length})</h3>
          <p className="mb-4 text-sm text-muted">Drag and drop to reorder FAQs.</p>
          {faqs.length < RECOMMENDED_MIN_FAQS && (
            <p className="mb-4 text-sm text-muted">
              Aim for {RECOMMENDED_MIN_FAQS}–10 FAQs for the best reader experience and search visibility.
            </p>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={faqs.map((faq) => faq.clientId)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-3" aria-label="FAQs">
                {faqs.map((faq, index) => (
                  <FaqEditorRow
                    key={faq.clientId}
                    faq={faq}
                    index={index}
                    total={faqs.length}
                    onFieldChange={handleFieldChange}
                    onRequestDelete={handleRequestDelete}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    isExpanded={expandedIds.has(faq.clientId)}
                    onToggleExpanded={toggleExpanded}
                    questionError={fieldErrors[`question-${faq.clientId}`]}
                    answerError={fieldErrors[`answer-${faq.clientId}`]}
                    autoFocus={faq.clientId === autoFocusId}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-btn bg-primary/5 p-4 text-sm text-body">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <p>Tip: Add FAQs based on common questions your audience asks. This helps improve reader trust and search visibility.</p>
      </div>

      <div className="mt-4 rounded-card border border-border bg-white p-5">
        <button
          type="button"
          onClick={() => setIsStructuredDataOpen((open) => !open)}
          aria-expanded={isStructuredDataOpen}
          aria-controls="faq-structured-data-preview"
          className="flex w-full items-center justify-between text-left text-card-title text-heading"
        >
          Structured Data Preview (JSON-LD)
          {isStructuredDataOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {isStructuredDataOpen && (
          <pre id="faq-structured-data-preview" className="mt-3 overflow-x-auto rounded-btn bg-surface-secondary p-3 text-xs text-body">
            {jsonLd ? JSON.stringify(jsonLd, null, 2) : 'Add at least one complete FAQ to generate structured data.'}
          </pre>
        )}
      </div>

      <DeleteFaqDialog faq={deleteTarget} onConfirm={handleConfirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}

export default BuyingGuideFaqsStep;
