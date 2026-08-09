import { Trophy } from 'lucide-react';
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
  if (!topPick) return null;
  const summary = summarize(topPick.whyRecommended ?? '');

  return (
    <section
      aria-labelledby="final-recommendation-heading"
      className="scroll-mt-24 rounded-card border border-amber-200 bg-amber-50 p-6 text-center sm:p-8"
    >
      <Trophy size={32} className="mx-auto mb-3 text-amber-500" aria-hidden="true" />
      <h2 id="final-recommendation-heading" className="mb-2 text-card-title text-heading">
        {number}. Final Recommendation
      </h2>
      {summary && <p className="mx-auto mb-5 max-w-xl text-body">{summary}</p>}
      <div className="mx-auto max-w-xs">
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
          {`View ${topPick.product.name} on Amazon`}
        </AmazonAffiliateButton>
      </div>
    </section>
  );
}

export default FinalRecommendationSection;
