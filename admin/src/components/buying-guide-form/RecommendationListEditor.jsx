import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import Button from '../Button.jsx';

function ListItemRow({ item, index, total, onContentChange, onMoveUp, onMoveDown, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.clientId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const label = item.content || `item ${index + 1}`;

  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder "${label}"`}
        className="cursor-grab rounded-btn p-1 text-muted hover:bg-surface-secondary active:cursor-grabbing"
      >
        <GripVertical size={14} />
      </button>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted">
        {index + 1}
      </span>
      <input
        type="text"
        value={item.content}
        onChange={(event) => onContentChange(item.clientId, event.target.value)}
        aria-label={`Item ${index + 1}`}
        className="min-w-0 flex-1 rounded-btn border border-border px-2 py-1.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        type="button"
        onClick={() => onMoveUp(index)}
        disabled={index === 0}
        aria-label={`Move "${label}" up`}
        className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowUp size={14} />
      </button>
      <button
        type="button"
        onClick={() => onMoveDown(index)}
        disabled={index === total - 1}
        aria-label={`Move "${label}" down`}
        className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowDown size={14} />
      </button>
      <button
        type="button"
        onClick={() => onRemove(item.clientId)}
        aria-label={`Delete "${label}"`}
        className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-danger"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

function RecommendationListEditor({ title, items, addLabel, onChange, error }) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function handleAdd() {
    onChange([...items, { clientId: crypto.randomUUID(), content: '' }]);
  }

  function handleContentChange(clientId, content) {
    onChange(items.map((item) => (item.clientId === clientId ? { ...item, content } : item)));
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...items];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === items.length - 1) return;
    const next = [...items];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function handleRemove(clientId) {
    onChange(items.filter((item) => item.clientId !== clientId));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.clientId === active.id);
    const newIndex = items.findIndex((item) => item.clientId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...items];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onChange(next);
  }

  return (
    <div className="rounded-btn border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-small font-semibold text-heading">{title}</h4>
        <Button type="button" variant="secondary" size="sm" onClick={handleAdd}>
          + Add {addLabel}
        </Button>
      </div>

      {items.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((item) => item.clientId)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2" aria-label={title}>
              {items.map((item, index) => (
                <ListItemRow
                  key={item.clientId}
                  item={item}
                  index={index}
                  total={items.length}
                  onContentChange={handleContentChange}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onRemove={handleRemove}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default RecommendationListEditor;
