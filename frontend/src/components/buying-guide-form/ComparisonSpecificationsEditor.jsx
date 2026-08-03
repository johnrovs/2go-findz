import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Info, Plus, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import Button from '../Button.jsx';
import EmptyState from '../EmptyState.jsx';
import ComparisonSpecificationRow from './ComparisonSpecificationRow.jsx';
import ResetComparisonDialog from './ResetComparisonDialog.jsx';

function buildEmptySpec(recommendedProducts) {
  return {
    clientId: crypto.randomUUID(),
    specificationName: '',
    values: recommendedProducts.map((product) => ({ productId: product.id, value: '' })),
  };
}

function buildDefaultComparisonSpecs(recommendedProducts) {
  return [
    {
      clientId: crypto.randomUUID(),
      specificationName: 'Price',
      values: recommendedProducts.map((product) => ({
        productId: product.id,
        value: `$${Number(product.productPrice).toFixed(2)}`,
      })),
    },
    {
      clientId: crypto.randomUUID(),
      specificationName: 'Customer Reviews',
      values: recommendedProducts.map((product) => ({
        productId: product.id,
        value: product.rating != null ? `${product.rating} (${(product.reviewCount ?? 0).toLocaleString()})` : '',
      })),
    },
    {
      clientId: crypto.randomUUID(),
      specificationName: 'Best For',
      values: recommendedProducts.map((product) => ({ productId: product.id, value: '' })),
    },
  ];
}

function ComparisonSpecificationsEditor({ comparisonSpecs, recommendedProducts, fieldErrors, onChange }) {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function handleAddSpecification() {
    onChange([...comparisonSpecs, buildEmptySpec(recommendedProducts)]);
  }

  function handleNameChange(clientId, name) {
    onChange(comparisonSpecs.map((spec) => (spec.clientId === clientId ? { ...spec, specificationName: name } : spec)));
  }

  function handleValueChange(clientId, productId, value) {
    onChange(
      comparisonSpecs.map((spec) =>
        spec.clientId === clientId
          ? { ...spec, values: spec.values.map((v) => (v.productId === productId ? { ...v, value } : v)) }
          : spec
      )
    );
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...comparisonSpecs];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === comparisonSpecs.length - 1) return;
    const next = [...comparisonSpecs];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function handleRemove(clientId) {
    onChange(comparisonSpecs.filter((spec) => spec.clientId !== clientId));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = comparisonSpecs.findIndex((spec) => spec.clientId === active.id);
    const newIndex = comparisonSpecs.findIndex((spec) => spec.clientId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...comparisonSpecs];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onChange(next);
  }

  function handleResetConfirm() {
    onChange(buildDefaultComparisonSpecs(recommendedProducts));
    setIsResetDialogOpen(false);
  }

  const noProducts = recommendedProducts.length === 0;

  return (
    <div className="rounded-card border border-border bg-white p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-card-title text-heading">Comparison Specifications</h3>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setIsResetDialogOpen(true)} disabled={noProducts}>
            <RotateCcw size={16} />
            Reset to Default
          </Button>
          <Button type="button" size="sm" onClick={handleAddSpecification} disabled={noProducts}>
            <Plus size={16} />
            Add Specification
          </Button>
        </div>
      </div>
      <p className="mb-4 text-sm text-muted">Drag and drop to reorder rows.</p>

      {noProducts ? (
        <EmptyState
          title="No products to compare"
          description="Add products in the Products step before building a comparison."
        />
      ) : comparisonSpecs.length === 0 ? (
        <EmptyState
          title="No specifications yet"
          description="Add a specification to start building your comparison table."
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={comparisonSpecs.map((spec) => spec.clientId)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3" aria-label="Comparison specifications">
              {comparisonSpecs.map((spec, index) => {
                const valueErrors = {};
                recommendedProducts.forEach((product) => {
                  const key = `spec-value-${spec.clientId}-${product.id}`;
                  if (fieldErrors[key]) valueErrors[product.id] = fieldErrors[key];
                });
                return (
                  <ComparisonSpecificationRow
                    key={spec.clientId}
                    spec={spec}
                    index={index}
                    total={comparisonSpecs.length}
                    products={recommendedProducts}
                    nameError={fieldErrors[`spec-name-${spec.clientId}`]}
                    valueErrors={valueErrors}
                    onNameChange={handleNameChange}
                    onValueChange={handleValueChange}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    onRemove={handleRemove}
                  />
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-btn bg-primary/5 p-4 text-sm text-body">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <p>Tip: Changes you make here will automatically update the comparison table on the published guide.</p>
      </div>

      <ResetComparisonDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleResetConfirm}
      />
    </div>
  );
}

export default ComparisonSpecificationsEditor;
