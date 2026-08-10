import { Check, X } from 'lucide-react';
import AmazonAffiliateButton from '../AmazonAffiliateButton.jsx';
import QuickPickBadge from '../buying-guide-form/QuickPickBadge.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';

function RecommendationCard({ recommendation, rank, badgeIndex = 0, onAffiliateClick }) {
  const { product, sectionLabel, whyRecommended, pros, cons, bestFor } = recommendation;
  const imageUrl = getImageUrl(product.imageFileName);

  return (
    <div className="rounded-card border border-border bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        {rank != null && <span className="text-xs font-semibold text-muted">#{rank}</span>}
        <QuickPickBadge label={sectionLabel || 'Untitled Badge'} index={badgeIndex} />
      </div>

      <div className="mb-3 flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-surface-secondary">
          {imageUrl && <img src={imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0">
          <h3 className="text-card-title text-heading">{product.name}</h3>
          {product.rating != null && (
            <p className="text-xs text-muted">
              ★ {product.rating} ({(product.reviewCount ?? 0).toLocaleString()} reviews)
            </p>
          )}
          <p className="text-sm font-semibold text-heading">${Number(product.productPrice).toFixed(2)}</p>
        </div>
      </div>

      <AmazonAffiliateButton productName={product.name} url={product.productLink} onClick={onAffiliateClick} className="mb-3" />

      {whyRecommended && (
        <div className="prose prose-sm mb-3 max-w-none text-body" dangerouslySetInnerHTML={{ __html: whyRecommended }} />
      )}

      {(pros.length > 0 || cons.length > 0 || bestFor.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-3">
          {pros.length > 0 && (
            <div>
              <span className="text-sm font-semibold text-heading">Pros</span>
              <ul className="mt-1 space-y-1">
                {pros.map((item, index) => (
                  <li key={index} className="flex items-start gap-1.5 text-sm text-body">
                    <Check size={14} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cons.length > 0 && (
            <div>
              <span className="text-sm font-semibold text-heading">Cons</span>
              <ul className="mt-1 space-y-1">
                {cons.map((item, index) => (
                  <li key={index} className="flex items-start gap-1.5 text-sm text-body">
                    <X size={14} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {bestFor.length > 0 && (
            <div>
              <span className="text-sm font-semibold text-heading">Best For</span>
              <ul className="mt-1 list-disc pl-5 text-sm text-body">
                {bestFor.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RecommendationCard;
