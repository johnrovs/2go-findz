import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import EmptyState from '../EmptyState.jsx';
import QuickPickEditorRow from './QuickPickEditorRow.jsx';

function QuickPickEditorList({ quickPicks, fieldErrors, onChange }) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function handleBadgeNameChange(productId, value) {
    onChange(quickPicks.map((qp) => (qp.product.id === productId ? { ...qp, badgeName: value } : qp)));
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...quickPicks];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === quickPicks.length - 1) return;
    const next = [...quickPicks];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function handleRemove(productId) {
    onChange(quickPicks.filter((qp) => qp.product.id !== productId));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = quickPicks.findIndex((qp) => qp.product.id === active.id);
    const newIndex = quickPicks.findIndex((qp) => qp.product.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...quickPicks];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onChange(next);
  }

  if (quickPicks.length === 0) {
    return (
      <EmptyState
        title="No Quick Picks yet"
        description="Add a Quick Pick to feature your top recommendations at the top of this guide."
      />
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={quickPicks.map((qp) => qp.product.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-3" aria-label="Quick picks">
          {quickPicks.map((quickPick, index) => (
            <QuickPickEditorRow
              key={quickPick.product.id}
              quickPick={quickPick}
              index={index}
              total={quickPicks.length}
              error={fieldErrors[quickPick.product.id]}
              onBadgeNameChange={handleBadgeNameChange}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

export default QuickPickEditorList;
