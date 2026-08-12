import { ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AmazonAffiliateButton from '../AmazonAffiliateButton.jsx';
import QuickPickBadge from '../buying-guide-form/QuickPickBadge.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { getAmazonMarketplace } from '../../utils/amazonLink.js';

function QuickRecommendationsSection({ quickRecommendations, number, guideId, onAffiliateClick }) {
  const { t } = useTranslation('guides');
  if (quickRecommendations.length === 0) return null;

  return (
    <section aria-labelledby="quick-recommendations-heading" className="scroll-mt-24">
      <h2 id="quick-recommendations-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
        {number}. {t('sections.quickRecommendations')}
      </h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        {quickRecommendations.map(({ product, badgeName }, index) => {
          const imageUrl = getImageUrl(product.imageFileName);
          return (
            <div key={product.id} className="flex flex-col rounded-card border border-border bg-white p-4">
              <QuickPickBadge label={badgeName || 'Untitled Badge'} index={index} className="self-center" />
              <div className="my-4 flex h-32 items-center justify-center">
                {imageUrl && (
                  <img src={imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-contain" />
                )}
              </div>
              <p className="mb-3 text-center text-sm font-semibold text-heading">{product.name}</p>
              <AmazonAffiliateButton
                productName={product.name}
                url={product.productLink}
                className="mt-auto"
                onClick={() =>
                  onAffiliateClick({
                    guideId,
                    productId: product.id,
                    section: 'quick_recommendations',
                    placement: index,
                    marketplace: getAmazonMarketplace(product.productLink),
                  })
                }
              >
                <ShoppingCart size={16} aria-hidden="true" />
                View on Amazon
              </AmazonAffiliateButton>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default QuickRecommendationsSection;
