import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import ComparisonProductsPanel from './ComparisonProductsPanel.jsx';
import ComparisonSpecificationsEditor from './ComparisonSpecificationsEditor.jsx';

const HOW_IT_WORKS_POINTS = [
  'Comparison products always match the products selected in the Products tab.',
  'Each product appears as a column in the published comparison table.',
  'Each specification you add appears as a row.',
  'The order you set here is the order that appears on the published guide.',
  'Changes here update the Live Preview immediately.',
];

function BuyingGuideComparisonStep({ comparisonSpecs, onChange, recommendedProducts, fieldErrors, onManageProducts }) {
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-card-title text-heading">Product Comparison</h2>
        <button
          type="button"
          aria-expanded={isHowItWorksOpen}
          aria-controls="comparison-how-it-works"
          onClick={() => setIsHowItWorksOpen((open) => !open)}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <HelpCircle size={14} />
          How it works
        </button>
      </div>
      <p className="mb-4 text-sm text-muted">
        Select products and customize the specifications to compare. Add, edit, reorder, or remove specifications as
        needed.
      </p>

      {isHowItWorksOpen && (
        <ul
          id="comparison-how-it-works"
          className="mb-4 list-disc space-y-1 rounded-btn bg-surface-secondary p-4 pl-8 text-sm text-body"
        >
          {HOW_IT_WORKS_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}

      <ComparisonProductsPanel recommendedProducts={recommendedProducts} onManageProducts={onManageProducts} />
      <ComparisonSpecificationsEditor
        comparisonSpecs={comparisonSpecs}
        recommendedProducts={recommendedProducts}
        fieldErrors={fieldErrors}
        onChange={onChange}
      />
    </div>
  );
}

export default BuyingGuideComparisonStep;
