import { useState } from 'react';
import { AlertTriangle, Award, Star } from 'lucide-react';
import Button from '../Button.jsx';
import EmptyState from '../EmptyState.jsx';
import ConfirmDialog from '../ConfirmDialog.jsx';
import RecommendationProductPicker from './RecommendationProductPicker.jsx';
import RecommendationBadgeField from './RecommendationBadgeField.jsx';
import RecommendationContentEditor from './RecommendationContentEditor.jsx';
import RecommendationListEditor from './RecommendationListEditor.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';

function TopPickSection({ topPick, eligibleProducts, onSelect, onRemove, onFieldChange, fieldErrors }) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);

  function handlePick(product) {
    if (topPick) {
      setPendingProduct(product);
    } else {
      onSelect(product);
    }
  }

  function handleConfirmReplace() {
    onSelect(pendingProduct);
    setPendingProduct(null);
  }

  function handleConfirmRemove() {
    onRemove();
    setIsRemoveConfirmOpen(false);
  }

  const imageUrl = topPick ? getImageUrl(topPick.product.imageFileName) : null;

  return (
    <div className="mb-6 rounded-card border border-border bg-white p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-card-title text-heading">Top Pick — Our #1 Recommendation</h3>
        {topPick && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setIsPickerOpen(true)}>
            Change Product
          </Button>
        )}
      </div>
      <p className="mb-4 text-sm text-muted">
        Select the product that is your top pick and add your expert reasons, pros, cons, and who it's best for.
      </p>

      {!topPick ? (
        <>
          <EmptyState
            title="No Top Pick selected"
            description="Choose the strongest overall product from this guide."
          />
          <div className="mt-4 flex justify-center">
            <Button type="button" size="sm" onClick={() => setIsPickerOpen(true)}>
              Add Top Pick Product
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 flex items-start justify-between gap-3 rounded-btn border border-border p-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
                {imageUrl && <img src={imageUrl} alt={topPick.product.name} className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-body">{topPick.product.name}</p>
                {topPick.product.brand && <p className="text-sm text-muted">{topPick.product.brand}</p>}
                <p className="mt-1 font-semibold text-heading">${Number(topPick.product.productPrice).toFixed(2)}</p>
                {topPick.product.rating != null && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-body">
                    <Star size={14} className="fill-star text-star" />
                    {topPick.product.rating}
                    <span className="text-muted">({topPick.product.reviewCount?.toLocaleString() ?? 0})</span>
                  </p>
                )}
                {topPick.product.active === false && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                    <AlertTriangle size={14} />
                    This product is no longer active.
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <Award size={12} />
                Top Pick
              </span>
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsRemoveConfirmOpen(true)}>
                Remove Product
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <RecommendationBadgeField
              id={`top-pick-badge-${topPick.clientId}`}
              value={topPick.sectionLabel}
              onChange={(value) => onFieldChange('sectionLabel', value)}
              error={fieldErrors[`badge-${topPick.clientId}`]}
            />
            <RecommendationContentEditor
              id={`top-pick-why-${topPick.clientId}`}
              value={topPick.whyRecommended}
              onChange={(value) => onFieldChange('whyRecommended', value)}
              error={fieldErrors[`why-${topPick.clientId}`]}
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <RecommendationListEditor
                title="Pros"
                items={topPick.pros}
                addLabel="Pro"
                onChange={(items) => onFieldChange('pros', items)}
                error={fieldErrors[`pros-${topPick.clientId}`]}
              />
              <RecommendationListEditor
                title="Cons"
                items={topPick.cons}
                addLabel="Con"
                onChange={(items) => onFieldChange('cons', items)}
                error={fieldErrors[`cons-${topPick.clientId}`]}
              />
              <RecommendationListEditor
                title="Best For"
                items={topPick.bestFor}
                addLabel="Item"
                onChange={(items) => onFieldChange('bestFor', items)}
                error={fieldErrors[`bestFor-${topPick.clientId}`]}
              />
            </div>
          </div>
        </>
      )}

      <RecommendationProductPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        title={topPick ? 'Change Top Pick Product' : 'Add Top Pick Product'}
        eligibleProducts={eligibleProducts}
        onSelect={handlePick}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingProduct)}
        title="Replace Top Pick?"
        message="Replacing your Top Pick will discard its written content for the current product. This can't be undone once you save."
        confirmLabel="Replace Product"
        isDestructive
        onConfirm={handleConfirmReplace}
        onCancel={() => setPendingProduct(null)}
      />

      <ConfirmDialog
        isOpen={isRemoveConfirmOpen}
        title="Remove Top Pick?"
        message="This removes the Top Pick recommendation only — the product stays in Products, Quick Picks, and Comparison."
        confirmLabel="Remove"
        isDestructive
        onConfirm={handleConfirmRemove}
        onCancel={() => setIsRemoveConfirmOpen(false)}
      />
    </div>
  );
}

export default TopPickSection;
