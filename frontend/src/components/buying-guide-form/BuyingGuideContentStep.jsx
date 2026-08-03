import { useEffect, useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { HelpCircle, Info, Plus } from 'lucide-react';
import Button from '../Button.jsx';
import EmptyState from '../EmptyState.jsx';
import ContentSectionEditorCard from './ContentSectionEditorCard.jsx';
import DeleteContentSectionDialog from './DeleteContentSectionDialog.jsx';

const HOW_IT_WORKS_POINTS = [
  'Each section has a title and rich-text content.',
  'Sections appear in the published guide in the order shown here.',
  'Expand a section to edit its content; collapse it to tidy up the list.',
  'Changes update the Live Preview immediately.',
  'Adding, renaming, reordering, or deleting a section here also updates the Table of Contents in Basic Info.',
];

let sectionCounter = 0;
function nextSectionClientId() {
  sectionCounter += 1;
  return `new-content-section-${sectionCounter}`;
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').trim();
}

function BuyingGuideContentStep({ tocEntries, onChange, fieldErrors }) {
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const customEntries = tocEntries.filter((entry) => !entry.sectionKey);

  useEffect(() => {
    const firstInvalid = customEntries.find(
      (entry) => fieldErrors[`title-${entry.clientId}`] || fieldErrors[`content-${entry.clientId}`]
    );
    if (firstInvalid) {
      setExpandedIds((prev) => new Set(prev).add(firstInvalid.clientId));
    }
    // Only re-run when the error set changes -- expanding on every tocEntries edit would
    // fight the admin's own manual collapse/expand clicks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldErrors]);

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
    const newEntry = { clientId: nextSectionClientId(), sectionKey: null, title: '', content: '', visible: true };
    onChange([...tocEntries, newEntry]);
    setExpandedIds((prev) => new Set(prev).add(newEntry.clientId));
  }

  function handleFieldChange(clientId, field, value) {
    onChange(tocEntries.map((entry) => (entry.clientId === clientId ? { ...entry, [field]: value } : entry)));
  }

  function handleToggleVisible(clientId) {
    onChange(tocEntries.map((entry) => (entry.clientId === clientId ? { ...entry, visible: !entry.visible } : entry)));
  }

  function handleRequestDelete(entry) {
    if (stripHtml(entry.content)) {
      setDeleteTarget(entry);
    } else {
      onChange(tocEntries.filter((e) => e.clientId !== entry.clientId));
    }
  }

  function handleConfirmDelete() {
    onChange(tocEntries.filter((e) => e.clientId !== deleteTarget.clientId));
    setDeleteTarget(null);
  }

  // Custom entries can be interleaved with structural ones in tocEntries (TocBuilder allows
  // dragging any entry anywhere). Reordering here must only change custom entries' order
  // relative to EACH OTHER, refilling the same array slots they already occupy, so structural
  // entries never move and this step never needs to know/care about their positions.
  function moveCustomEntry(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= customEntries.length) return;
    const customSlots = [];
    tocEntries.forEach((entry, i) => {
      if (!entry.sectionKey) customSlots.push(i);
    });
    const reorderedCustom = [...customEntries];
    const [moved] = reorderedCustom.splice(fromIndex, 1);
    reorderedCustom.splice(toIndex, 0, moved);
    const next = [...tocEntries];
    customSlots.forEach((slotIndex, i) => {
      next[slotIndex] = reorderedCustom[i];
    });
    onChange(next);
  }

  function handleMoveUp(index) {
    moveCustomEntry(index, index - 1);
  }

  function handleMoveDown(index) {
    moveCustomEntry(index, index + 1);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = customEntries.findIndex((entry) => entry.clientId === active.id);
    const newIndex = customEntries.findIndex((entry) => entry.clientId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    moveCustomEntry(oldIndex, newIndex);
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-card-title text-heading">Buying Guide Content</h2>
          <button
            type="button"
            aria-expanded={isHowItWorksOpen}
            aria-controls="buying-guide-content-how-it-works"
            onClick={() => setIsHowItWorksOpen((open) => !open)}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <HelpCircle size={14} />
            How it works
          </button>
        </div>
        <Button type="button" size="sm" onClick={handleAdd}>
          <Plus size={16} />
          Add Section
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted">
        Add helpful information, tips, and expert advice to help your readers make the best buying decision.
      </p>

      {isHowItWorksOpen && (
        <ul
          id="buying-guide-content-how-it-works"
          className="mb-4 list-disc space-y-1 rounded-btn bg-surface-secondary p-4 pl-8 text-sm text-body"
        >
          {HOW_IT_WORKS_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}

      {customEntries.length === 0 ? (
        <>
          <EmptyState
            title="No buying guide sections yet"
            description="Add helpful sections like how you tested products, what to look for, or buying tips for your readers."
          />
          <div className="mt-4 flex justify-center">
            <Button type="button" onClick={handleAdd}>
              <Plus size={16} />
              Add Your First Section
            </Button>
          </div>
        </>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={customEntries.map((entry) => entry.clientId)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3" aria-label="Buying guide sections">
              {customEntries.map((entry, index) => (
                <ContentSectionEditorCard
                  key={entry.clientId}
                  entry={entry}
                  index={index}
                  total={customEntries.length}
                  onFieldChange={handleFieldChange}
                  onToggleVisible={handleToggleVisible}
                  onRequestDelete={handleRequestDelete}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  isExpanded={expandedIds.has(entry.clientId)}
                  onToggleExpanded={toggleExpanded}
                  titleError={fieldErrors[`title-${entry.clientId}`]}
                  contentError={fieldErrors[`content-${entry.clientId}`]}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-btn bg-primary/5 p-4 text-sm text-body">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <p>Tip: Use sections to organize your buying guide content. Drag and drop to reorder the sections.</p>
      </div>

      <DeleteContentSectionDialog section={deleteTarget} onConfirm={handleConfirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}

export default BuyingGuideContentStep;
