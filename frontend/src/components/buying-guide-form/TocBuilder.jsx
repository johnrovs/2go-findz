import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Plus, X } from 'lucide-react';
import Button from '../Button.jsx';
import ConfirmDialog from '../ConfirmDialog.jsx';

export const STRUCTURAL_LABELS = {
  QUICK_RECOMMENDATIONS: 'Quick Recommendations',
  COMPARISON_TABLE: 'Comparison Table',
  TOP_PICK: 'Top Pick',
  RUNNER_UPS: 'Runner-Ups',
  FAQS: 'FAQs',
};

let customTocEntryCounter = 0;
function nextCustomClientId() {
  customTocEntryCounter += 1;
  return `new-custom-${customTocEntryCounter}`;
}

export function entryLabel(entry) {
  return entry.sectionKey ? STRUCTURAL_LABELS[entry.sectionKey] : entry.title || 'Untitled Section';
}

function TocRow({ entry, index, total, onToggleVisible, onEditCustom, onMoveUp, onMoveDown, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: entry.clientId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const label = entryLabel(entry);

  return (
    <li ref={setNodeRef} style={style} className="rounded-btn border border-border bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${label}`}
            className="cursor-grab rounded-btn p-1 text-muted hover:bg-surface-secondary active:cursor-grabbing"
          >
            <GripVertical size={16} />
          </button>
          {entry.sectionKey ? (
            <span className="truncate text-sm font-medium text-body">{label}</span>
          ) : (
            <input
              type="text"
              value={entry.title}
              onChange={(event) => onEditCustom(entry.clientId, { title: event.target.value })}
              placeholder="Section title"
              aria-label="Section title"
              className="w-full rounded-btn border border-border px-2 py-1.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            aria-label={`Move ${label} up`}
            className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp size={16} />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            aria-label={`Move ${label} down`}
            className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowDown size={16} />
          </button>
          <button
            type="button"
            onClick={() => onToggleVisible(entry.clientId)}
            aria-label={entry.visible ? `Hide ${label}` : `Show ${label}`}
            aria-pressed={entry.visible}
            className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary"
          >
            {entry.visible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          {!entry.sectionKey && (
            <button
              type="button"
              onClick={() => onDelete(entry)}
              aria-label={`Remove ${label}`}
              className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      {!entry.sectionKey && (
        <textarea
          value={entry.content}
          onChange={(event) => onEditCustom(entry.clientId, { content: event.target.value })}
          rows={3}
          placeholder="Section content"
          aria-label="Section content"
          className="mt-2 w-full rounded-btn border border-border px-2 py-1.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      )}
    </li>
  );
}

function TocBuilder({ tocEntries, onChange }) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function handleAdd() {
    onChange([...tocEntries, { clientId: nextCustomClientId(), sectionKey: null, title: '', content: '', visible: true }]);
  }

  function handleEditCustom(clientId, changes) {
    onChange(tocEntries.map((entry) => (entry.clientId === clientId ? { ...entry, ...changes } : entry)));
  }

  function handleToggleVisible(clientId) {
    onChange(tocEntries.map((entry) => (entry.clientId === clientId ? { ...entry, visible: !entry.visible } : entry)));
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...tocEntries];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === tocEntries.length - 1) return;
    const next = [...tocEntries];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function handleRequestDelete(entry) {
    if (entry.content.trim()) {
      setDeleteTarget(entry);
    } else {
      onChange(tocEntries.filter((e) => e.clientId !== entry.clientId));
    }
  }

  function handleConfirmDelete() {
    onChange(tocEntries.filter((e) => e.clientId !== deleteTarget.clientId));
    setDeleteTarget(null);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tocEntries.findIndex((entry) => entry.clientId === active.id);
    const newIndex = tocEntries.findIndex((entry) => entry.clientId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...tocEntries];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onChange(next);
  }

  return (
    <div>
      <span className="mb-1 block text-small font-medium text-body">Table of Contents</span>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tocEntries.map((entry) => entry.clientId)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2" aria-label="Table of contents entries">
            {tocEntries.map((entry, index) => (
              <TocRow
                key={entry.clientId}
                entry={entry}
                index={index}
                total={tocEntries.length}
                onToggleVisible={handleToggleVisible}
                onEditCustom={handleEditCustom}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onDelete={handleRequestDelete}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <Button type="button" variant="secondary" size="sm" onClick={handleAdd} className="mt-3">
        <Plus size={16} />
        Add Section
      </Button>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Remove Section"
        message={deleteTarget ? `"${entryLabel(deleteTarget)}" has content. This will permanently delete it.` : ''}
        confirmLabel="Remove"
        isDestructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default TocBuilder;
