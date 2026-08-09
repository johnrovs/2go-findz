import AmazonAffiliateButton from '../AmazonAffiliateButton.jsx';
import QuickPickBadge from '../buying-guide-form/QuickPickBadge.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { getAmazonMarketplace } from '../../utils/amazonLink.js';

function QuickRecommendationsSection({ quickRecommendations, number, guideId, onAffiliateClick }) {
  if (quickRecommendations.length === 0) return null;

  return (
    <section aria-labelledby="quick-recommendations-heading" className="scroll-mt-24">
      <h2 id="quick-recommendations-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
        {number}. Quick Recommendations
      </h2>
      <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {quickRecommendations.map(({ product, badgeName }, index) => {
          const imageUrl = getImageUrl(product.imageFileName);
          return (
            <div key={product.id} className="rounded-card border border-border bg-white p-4">
              <QuickPickBadge label={badgeName || 'Untitled Badge'} index={index} />
              <div className="my-3 aspect-square overflow-hidden rounded-md bg-surface-secondary">
                {imageUrl && <img src={imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover" />}
              </div>
              <p className="mb-1 text-sm font-semibold text-heading">{product.name}</p>
              {product.rating != null && (
                <p className="mb-1 text-xs text-muted">
                  ★ {product.rating} ({(product.reviewCount ?? 0).toLocaleString()})
                </p>
              )}
              <p className="mb-3 text-sm font-semibold text-heading">${Number(product.productPrice).toFixed(2)}</p>
              <AmazonAffiliateButton
                productName={product.name}
                url={product.productLink}
                onClick={() =>
                  onAffiliateClick({
                    guideId,
                    productId: product.id,
                    section: 'quick_recommendations',
                    placement: index,
                    marketplace: getAmazonMarketplace(product.productLink),
                  })
                }
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default QuickRecommendationsSection;
