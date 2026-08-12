import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AmazonAffiliateButton from '../AmazonAffiliateButton.jsx';
import { getAmazonMarketplace } from '../../utils/amazonLink.js';

const SUMMARY_CHAR_LIMIT = 200;

function summarize(html) {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= SUMMARY_CHAR_LIMIT) return text;
  const truncated = text.slice(0, SUMMARY_CHAR_LIMIT);
  const lastSpace = truncated.lastIndexOf(' ');
  return `${truncated.slice(0, lastSpace)}…`;
}

function FinalRecommendationSection({ topPick, number, guideId, onAffiliateClick }) {
  const { t } = useTranslation('guides');
  if (!topPick) return null;
  const summary = summarize(topPick.whyRecommended ?? '');

  return (
    <section
      aria-labelledby="final-recommendation-heading"
      className="scroll-mt-24 rounded-card border border-amber-200 bg-amber-50 p-6 sm:p-8"
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
        <Trophy size={40} className="shrink-0 text-amber-500" aria-hidden="true" />
        <div className="flex-1">
          <h2 id="final-recommendation-heading" className="mb-1 text-card-title text-heading">
            {number}. {t('sections.finalRecommendation')}
          </h2>
          {summary && <p className="text-body">{summary}</p>}
        </div>
        <div className="w-full shrink-0 sm:w-auto">
          <AmazonAffiliateButton
            productName={topPick.product.name}
            url={topPick.product.productLink}
            onClick={() =>
              onAffiliateClick({
                guideId,
                productId: topPick.product.id,
                section: 'final_recommendation',
                marketplace: getAmazonMarketplace(topPick.product.productLink),
              })
            }
          >
            {t('recommendation.viewProductOnAmazon', { productName: topPick.product.name })}
          </AmazonAffiliateButton>
        </div>
      </div>
    </section>
  );
}

export default FinalRecommendationSection;
