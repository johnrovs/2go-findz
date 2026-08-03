import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Button from '../Button.jsx';
import EmptyState from '../EmptyState.jsx';
import RunnerUpEditorCard from './RunnerUpEditorCard.jsx';
import RecommendationProductPicker from './RecommendationProductPicker.jsx';

const MAX_RUNNER_UPS = 4;

function RunnerUpsSection({ runnerUps, eligibleProducts, onAdd, onChangeProductRequest, onRemove, onFieldChange, onReorder, fieldErrors }) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [changingClientId, setChangingClientId] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const isAtMax = runnerUps.length >= MAX_RUNNER_UPS;

  function openAddPicker() {
    setChangingClientId(null);
    setIsPickerOpen(true);
  }

  function openChangePicker(clientId) {
    setChangingClientId(clientId);
    setIsPickerOpen(true);
  }

  function handlePicked(product) {
    if (changingClientId) {
      onChangeProductRequest(changingClientId, product);
    } else {
      onAdd(product);
    }
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...runnerUps];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onReorder(next);
  }

  function handleMoveDown(index) {
    if (index === runnerUps.length - 1) return;
    const next = [...runnerUps];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onReorder(next);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = runnerUps.findIndex((r) => r.clientId === active.id);
    const newIndex = runnerUps.findIndex((r) => r.clientId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...runnerUps];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onReorder(next);
  }

  return (
    <div className="rounded-card border border-border bg-white p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-card-title text-heading">Runner-Ups — Strong Alternative Choices</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            {runnerUps.length} / {MAX_RUNNER_UPS} Runner-Ups
          </span>
          <Button type="button" size="sm" onClick={openAddPicker} disabled={isAtMax}>
            Add Runner-Up Product
          </Button>
        </div>
      </div>
      <p className="mb-4 text-sm text-muted">
        Add alternative products for readers with different budgets, priorities, or use cases.
      </p>
      {isAtMax && (
        <p className="mb-4 text-sm text-muted">You've reached the maximum of 4 Runner-Ups for this guide.</p>
      )}

      {runnerUps.length === 0 ? (
        <EmptyState
          title="No Runner-Ups added"
          description="Add alternative recommendations for readers who need a different price, feature, or use case."
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={runnerUps.map((r) => r.clientId)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3" aria-label="Runner-Ups">
              {runnerUps.map((runnerUp, index) => (
                <RunnerUpEditorCard
                  key={runnerUp.clientId}
                  runnerUp={runnerUp}
                  index={index}
                  total={runnerUps.length}
                  onChangeProduct={openChangePicker}
                  onRemove={onRemove}
                  onFieldChange={onFieldChange}
                  fieldErrors={fieldErrors}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <RecommendationProductPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        title={changingClientId ? 'Change Runner-Up Product' : 'Add Runner-Up Product'}
        eligibleProducts={eligibleProducts}
        onSelect={handlePicked}
      />
    </div>
  );
}

export default RunnerUpsSection;
