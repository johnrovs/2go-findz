import { Check, X } from 'lucide-react';
import QuickPickBadge from '../buying-guide-form/QuickPickBadge.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { isSupportedAmazonUrl } from '../../utils/amazonLink.js';

function RecommendationCard({ recommendation, badgeIndex = 0, compact = false, onAffiliateClick }) {
  const { product, sectionLabel, whyRecommended, pros, cons, bestFor } = recommendation;
  const imageUrl = getImageUrl(product.imageFileName);
  const isLink = isSupportedAmazonUrl(product.productLink);

  return (
    <div className="rounded-card border border-border bg-white p-5">
      <div className="mb-3 flex justify-end">
        <QuickPickBadge label={sectionLabel || 'Untitled Badge'} index={badgeIndex} />
      </div>

      <div className="mb-3 flex items-center gap-4">
        <div
          className={`shrink-0 overflow-hidden rounded-md bg-surface-secondary ${compact ? 'h-16 w-16' : 'h-24 w-24'}`}
        >
          {imageUrl && (
            <img src={imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-card-title">
            {isLink ? (
              <a
                href={product.productLink}
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
                onClick={onAffiliateClick}
                className="font-semibold text-primary hover:underline"
              >
                {product.name}
              </a>
            ) : (
              <span className="font-semibold text-heading">{product.name}</span>
            )}
          </h3>
        </div>
      </div>

      {whyRecommended && (
        <div className="mb-3">
          <span className="text-sm font-semibold text-heading">Why We Recommend It</span>
          <div
            className="prose prose-sm mt-1 max-w-none text-body"
            dangerouslySetInnerHTML={{ __html: whyRecommended }}
          />
        </div>
      )}

      {(pros.length > 0 || cons.length > 0 || bestFor.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {pros.length > 0 && (
            <div>
              <span className="text-sm font-semibold text-success">Pros</span>
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
              <span className="text-sm font-semibold text-danger">Cons</span>
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
              <span className="text-sm font-semibold text-primary">Best For</span>
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
