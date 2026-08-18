import { useState } from 'react';
import { HelpCircle, Info } from 'lucide-react';
import TopPickSection from './TopPickSection.jsx';
import RunnerUpsSection from './RunnerUpsSection.jsx';

const HOW_IT_WORKS_POINTS = [
  'The Top Pick is the guide’s primary recommendation.',
  'Only one product can be the active Top Pick.',
  'Runner-Ups are alternative recommendations.',
  'Products must come from the Products tab.',
  'A product cannot be both the Top Pick and a Runner-Up.',
  'The order you set here determines the published display order.',
  'Changes update the live published preview.',
];

function buildRecommendation(product, recommendationType) {
  return {
    clientId: crypto.randomUUID(),
    product,
    recommendationType,
    sectionLabel: '',
    whyRecommended: '',
    pros: [],
    cons: [],
    bestFor: [],
  };
}

function TopPicksAndRunnerUpsStep({ recommendationSections, onChange, recommendedProducts, fieldErrors }) {
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  const topPick = recommendationSections.find((s) => s.recommendationType === 'TOP_PICK') ?? null;
  const runnerUps = recommendationSections.filter((s) => s.recommendationType === 'RUNNER_UP');
  const usedProductIds = new Set(recommendationSections.map((s) => s.product.id));

  function sortWithTopPickFirst(sections) {
    const nextTopPick = sections.find((s) => s.recommendationType === 'TOP_PICK');
    const nextRunnerUps = sections.filter((s) => s.recommendationType === 'RUNNER_UP');
    return nextTopPick ? [nextTopPick, ...nextRunnerUps] : nextRunnerUps;
  }

  function handleTopPickSelect(product) {
    const withoutOldTopPick = recommendationSections.filter((s) => s.recommendationType !== 'TOP_PICK');
    onChange(sortWithTopPickFirst([...withoutOldTopPick, buildRecommendation(product, 'TOP_PICK')]));
  }

  function handleTopPickRemove() {
    onChange(recommendationSections.filter((s) => s.recommendationType !== 'TOP_PICK'));
  }

  function handleTopPickFieldChange(field, value) {
    onChange(
      recommendationSections.map((s) => (s.recommendationType === 'TOP_PICK' ? { ...s, [field]: value } : s))
    );
  }

  function handleRunnerUpAdd(product) {
    onChange(sortWithTopPickFirst([...recommendationSections, buildRecommendation(product, 'RUNNER_UP')]));
  }

  function handleRunnerUpChangeProduct(clientId, product) {
    onChange(
      recommendationSections.map((s) => (s.clientId === clientId ? { ...buildRecommendation(product, 'RUNNER_UP'), clientId } : s))
    );
  }

  function handleRunnerUpRemove(clientId) {
    onChange(recommendationSections.filter((s) => s.clientId !== clientId));
  }

  function handleRunnerUpFieldChange(clientId, field, value) {
    onChange(recommendationSections.map((s) => (s.clientId === clientId ? { ...s, [field]: value } : s)));
  }

  function handleRunnerUpReorder(nextRunnerUps) {
    onChange(sortWithTopPickFirst([...(topPick ? [topPick] : []), ...nextRunnerUps]));
  }

  const topPickEligibleProducts = recommendedProducts.filter(
    (product) => !usedProductIds.has(product.id) || product.id === topPick?.product.id
  );
  const runnerUpEligibleProducts = recommendedProducts.filter((product) => !usedProductIds.has(product.id));

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-card-title text-heading">Top Picks & Runner-Ups</h2>
        <button
          type="button"
          aria-expanded={isHowItWorksOpen}
          aria-controls="top-picks-runner-ups-how-it-works"
          onClick={() => setIsHowItWorksOpen((open) => !open)}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <HelpCircle size={14} />
          How it works
        </button>
      </div>
      <p className="mb-4 text-sm text-muted">
        Select your top recommended product and add the best alternative choices. Explain why each product stands
        out, including its strengths, limitations, and ideal audience.
      </p>

      {isHowItWorksOpen && (
        <ul
          id="top-picks-runner-ups-how-it-works"
          className="mb-4 list-disc space-y-1 rounded-btn bg-surface-secondary p-4 pl-8 text-sm text-body"
        >
          {HOW_IT_WORKS_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}

      <TopPickSection
        topPick={topPick}
        eligibleProducts={topPickEligibleProducts}
        onSelect={handleTopPickSelect}
        onRemove={handleTopPickRemove}
        onFieldChange={handleTopPickFieldChange}
        fieldErrors={fieldErrors}
      />

      <RunnerUpsSection
        runnerUps={runnerUps}
        eligibleProducts={runnerUpEligibleProducts}
        onAdd={handleRunnerUpAdd}
        onChangeProductRequest={handleRunnerUpChangeProduct}
        onRemove={handleRunnerUpRemove}
        onFieldChange={handleRunnerUpFieldChange}
        onReorder={handleRunnerUpReorder}
        fieldErrors={fieldErrors}
      />

      <div className="mt-4 flex items-start gap-2 rounded-btn bg-primary/5 p-4 text-sm text-body">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <p>
          Tip: Your Top Pick is the primary recommendation. Runner-Ups give readers strong alternatives based on
          budget, features, and individual needs.
        </p>
      </div>
    </div>
  );
}

export default TopPicksAndRunnerUpsStep;
