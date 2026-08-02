import { useState } from 'react';
import { HelpCircle, Info, Plus } from 'lucide-react';
import Button from '../Button.jsx';
import QuickPickEditorList from './QuickPickEditorList.jsx';
import AddQuickPickDialog from './AddQuickPickDialog.jsx';

const MAX_QUICK_PICKS = 5;

const HOW_IT_WORKS_POINTS = [
  'Quick Picks highlight the best products at the beginning of a buying guide.',
  'Every quick pick must use a product already included in the Products tab.',
  'Each product should have a clear recommendation badge.',
  'The saved order determines the published display order.',
];

function BuyingGuideQuickPicksStep({ quickRecommendations, onChange, recommendedProducts, fieldErrors }) {
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const usedProductIds = new Set(quickRecommendations.map((qp) => qp.product.id));
  const eligibleProducts = recommendedProducts.filter((product) => !usedProductIds.has(product.id));
  const isAtMax = quickRecommendations.length >= MAX_QUICK_PICKS;

  function handleAdd(product) {
    onChange([...quickRecommendations, { product, badgeName: '' }]);
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-card-title text-heading">Quick Picks</h2>
          <button
            type="button"
            aria-expanded={isHowItWorksOpen}
            aria-controls="quick-picks-how-it-works"
            onClick={() => setIsHowItWorksOpen((open) => !open)}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <HelpCircle size={14} />
            How it works
          </button>
        </div>
        <Button type="button" size="sm" disabled={isAtMax} onClick={() => setIsAddDialogOpen(true)}>
          <Plus size={16} />
          Add Quick Pick
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted">
        Add your top quick recommendations. These items will appear at the top of your buying guide to help readers
        compare the best options at a glance.
      </p>

      {isHowItWorksOpen && (
        <ul id="quick-picks-how-it-works" className="mb-4 list-disc space-y-1 rounded-btn bg-surface-secondary p-4 pl-8 text-sm text-body">
          {HOW_IT_WORKS_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}

      {isAtMax && (
        <p className="mb-4 text-sm text-muted">You've reached the maximum of 5 Quick Picks for this guide.</p>
      )}

      <QuickPickEditorList quickPicks={quickRecommendations} fieldErrors={fieldErrors} onChange={onChange} />

      <div className="mt-4 flex items-start gap-2 rounded-btn bg-primary/5 p-4 text-sm text-body">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <p>
          Tip: Drag and drop to reorder your quick picks. The order you set here is the order that will appear on
          your published guide.
        </p>
      </div>

      <AddQuickPickDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        eligibleProducts={eligibleProducts}
        onAdd={handleAdd}
      />
    </div>
  );
}

export default BuyingGuideQuickPicksStep;
