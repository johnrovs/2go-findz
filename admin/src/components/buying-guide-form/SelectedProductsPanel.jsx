import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical, Image as ImageIcon, Trash2 } from 'lucide-react';
import EmptyState from '../EmptyState.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';

function SelectedProductRow({ product, index, total, onMoveUp, onMoveDown, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const imageUrl = getImageUrl(product.imageFileName);

  return (
    <li ref={setNodeRef} style={style} className="flex items-center justify-between gap-3 rounded-btn border border-border bg-white p-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${product.name}`}
          className="cursor-grab rounded-btn p-1 text-muted hover:bg-surface-secondary active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} className="h-10 w-10 shrink-0 rounded-md object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100">
            <ImageIcon className="h-4 w-4 text-slate-300" />
          </div>
        )}
        <span className="truncate text-sm font-medium text-body">{product.name}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
          aria-label={`Move ${product.name} up`}
          className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUp size={16} />
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(index)}
          disabled={index === total - 1}
          aria-label={`Move ${product.name} down`}
          className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowDown size={16} />
        </button>
        <button
          type="button"
          onClick={() => onRemove(product.id)}
          aria-label={`Remove ${product.name}`}
          className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}

function SelectedProductsPanel({ selectedProducts, onChange }) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...selectedProducts];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === selectedProducts.length - 1) return;
    const next = [...selectedProducts];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function handleRemove(id) {
    onChange(selectedProducts.filter((product) => product.id !== id));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = selectedProducts.findIndex((product) => product.id === active.id);
    const newIndex = selectedProducts.findIndex((product) => product.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...selectedProducts];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onChange(next);
  }

  return (
    <div>
      <h3 className="mb-3 text-small font-medium text-body">
        {selectedProducts.length} product{selectedProducts.length === 1 ? '' : 's'} selected
      </h3>
      {selectedProducts.length === 0 ? (
        <EmptyState
          title="No products selected yet"
          description="Search the catalog on the left and click Add to select products for this guide."
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={selectedProducts.map((product) => product.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2" aria-label="Selected products">
              {selectedProducts.map((product, index) => (
                <SelectedProductRow
                  key={product.id}
                  product={product}
                  index={index}
                  total={selectedProducts.length}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onRemove={handleRemove}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

export default SelectedProductsPanel;
