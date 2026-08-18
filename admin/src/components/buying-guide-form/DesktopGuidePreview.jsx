import { useTranslation } from 'react-i18next';
import BuyingGuideHero from '../buying-guide/BuyingGuideHero.jsx';
import GuideTableOfContents from '../buying-guide/GuideTableOfContents.jsx';
import QuickRecommendationsSection from '../buying-guide/QuickRecommendationsSection.jsx';
import ProductComparisonSection from '../buying-guide/ProductComparisonSection.jsx';
import TopPickSection from '../buying-guide/TopPickSection.jsx';
import RunnerUpsSection from '../buying-guide/RunnerUpsSection.jsx';
import BuyingGuideContentSection from '../buying-guide/BuyingGuideContentSection.jsx';
import BuyingGuideFaqSection from '../buying-guide/BuyingGuideFaqSection.jsx';
import FinalRecommendationSection from '../buying-guide/FinalRecommendationSection.jsx';
import { uniqueSlug } from '../../utils/slugify.js';
import { computeGuideSectionNumbers } from '../../utils/computeGuideSectionNumbers.js';

const noop = () => {};

const STRUCTURAL_ANCHOR_IDS = {
  QUICK_RECOMMENDATIONS: 'quick-recommendations',
  COMPARISON_TABLE: 'product-comparison',
  TOP_PICK: 'top-pick',
  RUNNER_UPS: 'runner-ups',
  FAQS: 'faq',
};

function toRecommendationCardShape(section) {
  return {
    product: section.product,
    recommendationType: section.recommendationType,
    sectionLabel: section.sectionLabel,
    whyRecommended: section.whyRecommended,
    pros: section.pros.map((item) => item.content),
    cons: section.cons.map((item) => item.content),
    bestFor: section.bestFor.map((item) => item.content),
  };
}

function handleNavigate(item) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(item.anchorId)?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
}

function DesktopGuidePreview({
  title,
  excerpt,
  coverImageFilename,
  tocEntries,
  settings,
  quickRecommendations = [],
  comparisonSpecs = [],
  comparisonProducts = [],
  recommendationSections = [],
  faqs = [],
}) {
  const { t } = useTranslation('guides');
  const visibleEntries = tocEntries.filter((entry) => entry.visible);
  const topPick = recommendationSections.find((s) => s.recommendationType === 'TOP_PICK') ?? null;
  const runnerUps = recommendationSections.filter((s) => s.recommendationType === 'RUNNER_UP');
  const topPickShape = topPick ? toRecommendationCardShape(topPick) : null;
  const runnerUpShapes = runnerUps.map(toRecommendationCardShape);

  const customSections = tocEntries.filter(
    (entry) => !entry.sectionKey && entry.visible && entry.title.trim() && entry.content.replace(/<[^>]*>/g, '').trim()
  );
  const hasBuyingGuideContent = customSections.length > 0;
  const usedAnchorSlugs = new Set();
  const contentSections = customSections.map((entry) => ({
    title: entry.title,
    content: entry.content,
    anchorId: uniqueSlug(entry.title, usedAnchorSlugs),
  }));

  const comparisonTable =
    comparisonSpecs.length > 0 && comparisonProducts.length > 0
      ? {
          specificationNames: comparisonSpecs.map((spec) => spec.specificationName || 'Untitled Specification'),
          rows: comparisonProducts.map((product) => ({
            product,
            specificationValues: comparisonSpecs.map(
              (spec) => spec.values.find((v) => v.productId === product.id)?.value ?? ''
            ),
          })),
        }
      : null;

  const faqItems = faqs.map((faq) => ({ question: faq.question, answer: faq.answer }));

  const sectionNumbers = computeGuideSectionNumbers(visibleEntries, {
    hasQuickRecommendations: quickRecommendations.length > 0,
    hasComparison: Boolean(comparisonTable),
    hasTopPick: Boolean(topPick),
    hasBuyingGuideContent,
    hasRunnerUps: runnerUps.length > 0,
    hasFaqs: faqs.length > 0,
    hasFinalRecommendation: Boolean(topPick),
  });

  const structuralLabels = {
    QUICK_RECOMMENDATIONS: t('sections.quickRecommendations'),
    COMPARISON_TABLE: t('sections.comparisonTable'),
    TOP_PICK: t('sections.topPick'),
    RUNNER_UPS: t('sections.runnerUps'),
    FAQS: t('sections.faqs'),
  };

  const tocItems = [];
  let buyingGuideAdded = false;
  visibleEntries.forEach((entry) => {
    if (entry.sectionKey) {
      const number = sectionNumbers[entry.sectionKey];
      if (number) {
        tocItems.push({
          id: entry.sectionKey,
          number,
          label: structuralLabels[entry.sectionKey],
          anchorId: STRUCTURAL_ANCHOR_IDS[entry.sectionKey],
        });
      }
      return;
    }
    if (!buyingGuideAdded && sectionNumbers.BUYING_GUIDE) {
      tocItems.push({ id: 'BUYING_GUIDE', number: sectionNumbers.BUYING_GUIDE, label: t('sections.buyingGuide'), anchorId: 'buying-guide' });
      buyingGuideAdded = true;
    }
  });
  if (sectionNumbers.FINAL_RECOMMENDATION) {
    tocItems.push({
      id: 'FINAL_RECOMMENDATION',
      number: sectionNumbers.FINAL_RECOMMENDATION,
      label: t('sections.finalRecommendation'),
      anchorId: 'final-recommendation',
    });
  }

  return (
    <div>
      <p className="mb-4 text-xs text-muted">Home / Buying Guides / {title || 'Untitled Guide'}</p>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <BuyingGuideHero
          title={title || 'Untitled Guide'}
          excerpt={excerpt}
          coverImageFilename={coverImageFilename}
          updatedAt={null}
          affiliateDisclosure={settings?.affiliateDisclosure}
        />
        <GuideTableOfContents items={tocItems} activeId={null} onNavigate={handleNavigate} />
      </div>

      <div className="mt-6 space-y-10">
        <div id="quick-recommendations">
          <QuickRecommendationsSection
            quickRecommendations={quickRecommendations}
            number={sectionNumbers.QUICK_RECOMMENDATIONS}
            guideId={null}
            onAffiliateClick={noop}
          />
        </div>
        <div id="product-comparison">
          <ProductComparisonSection
            comparisonTable={comparisonTable}
            number={sectionNumbers.COMPARISON_TABLE}
            guideId={null}
            onProductClick={noop}
          />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div id="top-pick">
            <TopPickSection topPick={topPickShape} number={sectionNumbers.TOP_PICK} guideId={null} onAffiliateClick={noop} />
          </div>
          <div id="runner-ups">
            <RunnerUpsSection runnerUps={runnerUpShapes} number={sectionNumbers.RUNNER_UPS} guideId={null} onAffiliateClick={noop} />
          </div>
        </div>
        <div id="buying-guide">
          <BuyingGuideContentSection sections={contentSections} number={sectionNumbers.BUYING_GUIDE} guideId={null} onExpand={noop} />
        </div>
        <div id="faq">
          <BuyingGuideFaqSection faqs={faqItems} number={sectionNumbers.FAQS} guideId={null} />
        </div>
        <div id="final-recommendation">
          <FinalRecommendationSection
            topPick={topPickShape}
            number={sectionNumbers.FINAL_RECOMMENDATION}
            guideId={null}
            onAffiliateClick={noop}
          />
        </div>
      </div>
    </div>
  );
}

export default DesktopGuidePreview;
