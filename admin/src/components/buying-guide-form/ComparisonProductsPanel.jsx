import { Image as ImageIcon } from 'lucide-react';
import Button from '../Button.jsx';
import EmptyState from '../EmptyState.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';

function ComparisonProductsPanel({ recommendedProducts, onManageProducts }) {
  return (
    <div className="mb-6 rounded-card border border-border bg-white p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-card-title text-heading">
          Products in This Comparison ({recommendedProducts.length})
        </h3>
        <Button type="button" variant="secondary" size="sm" onClick={onManageProducts}>
          Manage in Products step
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted">
        These are the products selected in the Products step. Add, remove, or reorder them there.
      </p>

      {recommendedProducts.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add products in the Products step before building a comparison."
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2" aria-label="Products in this comparison">
          {recommendedProducts.map((product, index) => {
            const imageUrl = getImageUrl(product.imageFileName);
            return (
              <div key={product.id} className="w-32 shrink-0 rounded-btn border border-border p-3 text-center">
                <span className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted">
                  {index + 1}
                </span>
                <div className="mx-auto mb-2 h-16 w-16 overflow-hidden rounded-md bg-slate-100">
                  {imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-slate-300" />
                    </div>
                  )}
                </div>
                <p className="truncate text-xs font-medium text-body">{product.name}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ComparisonProductsPanel;
