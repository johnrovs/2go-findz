import { Award, Check, Medal, X } from 'lucide-react';
import AmazonAffiliateButton from '../AmazonAffiliateButton.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';

function RecommendationCard({ recommendation, rank, onAffiliateClick }) {
  const { product, recommendationType, sectionLabel, whyRecommended, pros, cons, bestFor } = recommendation;
  const isTopPick = recommendationType === 'TOP_PICK';
  const imageUrl = getImageUrl(product.imageFileName);

  return (
    <div className="rounded-card border border-border bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        {rank != null && <span className="text-xs font-semibold text-muted">#{rank}</span>}
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {isTopPick ? <Award size={14} aria-hidden="true" /> : <Medal size={14} aria-hidden="true" />}
          {sectionLabel || 'Untitled Badge'}
        </span>
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

      {pros.length > 0 && (
        <ul className="mb-2 space-y-1">
          {pros.map((item, index) => (
            <li key={index} className="flex items-start gap-1.5 text-sm text-body">
              <Check size={14} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      )}

      {cons.length > 0 && (
        <ul className="mb-2 space-y-1">
          {cons.map((item, index) => (
            <li key={index} className="flex items-start gap-1.5 text-sm text-body">
              <X size={14} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      )}

      {bestFor.length > 0 && (
        <div>
          <span className="text-sm font-semibold text-heading">Best For</span>
          <ul className="list-disc pl-5 text-sm text-body">
            {bestFor.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default RecommendationCard;
