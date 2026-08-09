import { useState } from 'react';
import RecommendationCard from './RecommendationCard.jsx';
import { getAmazonMarketplace } from '../../utils/amazonLink.js';

const INITIAL_VISIBLE_COUNT = 4;

function RunnerUpsSection({ runnerUps, number, guideId, onAffiliateClick }) {
  const [showAll, setShowAll] = useState(false);
  if (runnerUps.length === 0) return null;

  const visibleRunnerUps = showAll ? runnerUps : runnerUps.slice(0, INITIAL_VISIBLE_COUNT);

  return (
    <section aria-labelledby="runner-ups-heading" className="scroll-mt-24">
      <h2 id="runner-ups-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
        {number}. Runner-Ups
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {visibleRunnerUps.map((runnerUp, index) => (
          <RecommendationCard
            key={runnerUp.product.id}
            recommendation={runnerUp}
            rank={index + 1}
            onAffiliateClick={() =>
              onAffiliateClick({
                guideId,
                productId: runnerUp.product.id,
                section: 'runner_up',
                placement: index,
                marketplace: getAmazonMarketplace(runnerUp.product.productLink),
              })
            }
          />
        ))}
      </div>
      {runnerUps.length > INITIAL_VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          aria-expanded={showAll}
          className="mt-4 text-sm font-semibold text-primary hover:underline"
        >
          {showAll ? 'Show fewer runner-ups' : 'See all reviewed products'}
        </button>
      )}
    </section>
  );
}

export default RunnerUpsSection;
