import { useTranslation } from 'react-i18next';
import RecommendationCard from './RecommendationCard.jsx';
import { getAmazonMarketplace } from '../../utils/amazonLink.js';

function TopPickSection({ topPick, number, guideId, onAffiliateClick }) {
  const { t } = useTranslation('guides');
  if (!topPick) return null;

  return (
    <section aria-labelledby="top-pick-heading" className="scroll-mt-24">
      <h2 id="top-pick-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
        {number}. {t('sections.topPick')}
      </h2>
      <RecommendationCard
        recommendation={topPick}
        onAffiliateClick={() =>
          onAffiliateClick({
            guideId,
            productId: topPick.product.id,
            section: 'top_pick',
            marketplace: getAmazonMarketplace(topPick.product.productLink),
          })
        }
      />
    </section>
  );
}

export default TopPickSection;
