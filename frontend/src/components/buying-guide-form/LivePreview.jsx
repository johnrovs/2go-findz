import { useState } from 'react';
import { Image as ImageIcon, Monitor, Smartphone } from 'lucide-react';
import AffiliateDisclosure from '../AffiliateDisclosure.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { STRUCTURAL_LABELS } from './TocBuilder.jsx';
import QuickPickBadge from './QuickPickBadge.jsx';
import { isSupportedAmazonUrl } from '../../utils/amazonLink.js';
import { computeGuideSectionNumbers } from '../../utils/computeGuideSectionNumbers.js';
import ComparisonTable from '../buying-guide/ComparisonTable.jsx';
import RecommendationCard from '../buying-guide/RecommendationCard.jsx';
import BuyingGuideContentCard from '../buying-guide/BuyingGuideContentCard.jsx';
import BuyingGuideFaqAccordion from '../buying-guide/BuyingGuideFaqAccordion.jsx';

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

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

function LivePreview({
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
  const [device, setDevice] = useState('desktop');
  const previewUrl = getImageUrl(coverImageFilename);
  const visibleEntries = tocEntries.filter((entry) => entry.visible);
  const topPick = recommendationSections.find((s) => s.recommendationType === 'TOP_PICK') ?? null;
  const runnerUps = recommendationSections.filter((s) => s.recommendationType === 'RUNNER_UP');

  const customSections = tocEntries.filter(
    (entry) => !entry.sectionKey && entry.visible && entry.title.trim() && entry.content.replace(/<[^>]*>/g, '').trim()
  );
  const hasBuyingGuideContent = customSections.length > 0;
  const usedAnchorSlugs = new Set();
  const customSectionsWithAnchors = customSections.map((entry) => ({
    entry,
    anchorId: uniqueSlug(entry.title, usedAnchorSlugs),
  }));
  const anchorsByClientId = new Map(customSectionsWithAnchors.map(({ entry, anchorId }) => [entry.clientId, anchorId]));

  const sectionNumbers = computeGuideSectionNumbers(visibleEntries, {
    hasQuickRecommendations: quickRecommendations.length > 0,
    hasComparison: comparisonSpecs.length > 0 && comparisonProducts.length > 0,
    hasTopPick: Boolean(topPick),
    hasBuyingGuideContent,
    hasRunnerUps: runnerUps.length > 0,
    hasFaqs: faqs.length > 0,
    hasFinalRecommendation: false,
  });

  return (
    <div className={`rounded-card border border-border bg-white p-5 ${device === 'mobile' ? 'mx-auto max-w-[375px]' : ''}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted">Home / Buying Guides / {title || 'Untitled Guide'}</p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            aria-label="Preview on desktop"
            aria-pressed={device === 'desktop'}
            className={`rounded-btn p-1.5 ${device === 'desktop' ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-secondary'}`}
          >
            <Monitor size={16} />
          </button>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            aria-label="Preview on mobile"
            aria-pressed={device === 'mobile'}
            className={`rounded-btn p-1.5 ${device === 'mobile' ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-secondary'}`}
          >
            <Smartphone size={16} />
          </button>
        </div>
      </div>

      <div className="mb-4 flex h-40 items-center justify-center overflow-hidden rounded-image bg-surface-secondary">
        {previewUrl ? (
          <img src={previewUrl} alt={title || 'Buying guide preview'} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-10 w-10 text-slate-300" />
        )}
      </div>

      <h2 className="mb-1 text-card-title text-heading">{title || 'Untitled Guide'}</h2>
      <p className="mb-4 text-xs text-muted">By 2Go Findz Team &middot; Updated {todayLabel()}</p>

      {excerpt && <p className="mb-4 text-sm text-body">{excerpt}</p>}

      {visibleEntries.length > 0 && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">Table of Contents</span>
          <ul className="space-y-1" aria-label="Table of contents">
            {visibleEntries.map((entry, index) => {
              const label = entry.sectionKey ? STRUCTURAL_LABELS[entry.sectionKey] : entry.title || 'Untitled Section';
              const anchorId = entry.sectionKey ? null : anchorsByClientId.get(entry.clientId);
              return (
                <li key={entry.clientId} className="flex items-center gap-2 text-sm text-primary">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  {anchorId ? (
                    <a href={`#${anchorId}`} className="hover:underline">
                      {label}
                    </a>
                  ) : (
                    <span>{label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {quickRecommendations.length > 0 && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            {sectionNumbers.QUICK_RECOMMENDATIONS}. Quick Recommendations
          </span>
          <ul className="space-y-3">
            {quickRecommendations.map(({ product, badgeName }, index) => {
              const imageUrl = getImageUrl(product.imageFileName);
              const linkSupported = isSupportedAmazonUrl(product.productLink);
              return (
                <li key={product.id} className="rounded-btn border border-border p-3">
                  <QuickPickBadge label={badgeName || 'Untitled Badge'} index={index} />
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-surface-secondary">
                      {imageUrl && <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-heading">{product.name}</p>
                      {product.rating != null && (
                        <p className="text-xs text-muted">
                          ★ {product.rating} ({product.reviewCount?.toLocaleString() ?? 0})
                        </p>
                      )}
                      <p className="text-sm font-semibold text-heading">${Number(product.productPrice).toFixed(2)}</p>
                    </div>
                  </div>
                  {linkSupported ? (
                    <a
                      href={product.productLink}
                      target="_blank"
                      rel="nofollow sponsored noopener noreferrer"
                      className="mt-2 block rounded-btn bg-amazon px-3 py-1.5 text-center text-sm font-semibold text-white hover:bg-amazon-hover"
                    >
                      View on Amazon
                    </a>
                  ) : (
                    <span className="mt-2 block rounded-btn bg-slate-200 px-3 py-1.5 text-center text-sm font-semibold text-muted">
                      Link unavailable
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {comparisonSpecs.length > 0 && comparisonProducts.length > 0 && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            {sectionNumbers.COMPARISON_TABLE}. Comparison Table
          </span>
          <ComparisonTable
            comparisonTable={{
              specificationNames: comparisonSpecs.map((spec) => spec.specificationName || 'Untitled Specification'),
              rows: comparisonProducts.map((product) => ({
                product,
                specificationValues: comparisonSpecs.map(
                  (spec) => spec.values.find((v) => v.productId === product.id)?.value ?? ''
                ),
              })),
            }}
          />
        </div>
      )}

      {topPick && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            {sectionNumbers.TOP_PICK}. Our Top Pick
          </span>
          <RecommendationCard recommendation={toRecommendationCardShape(topPick)} rank={null} />
        </div>
      )}

      {runnerUps.length > 0 && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            {sectionNumbers.RUNNER_UPS}. Runner-Ups
          </span>
          {runnerUps.map((section, index) => (
            <div key={section.clientId} className="mt-3 first:mt-0">
              <RecommendationCard recommendation={toRecommendationCardShape(section)} rank={index + 1} />
            </div>
          ))}
        </div>
      )}

      {hasBuyingGuideContent && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            {sectionNumbers.BUYING_GUIDE}. Buying Guide
          </span>
          {customSectionsWithAnchors.map(({ entry, anchorId }, index) => (
            <div key={entry.clientId} className={index > 0 ? 'mt-3' : ''}>
              <BuyingGuideContentCard
                title={entry.title || 'Untitled Section'}
                content={entry.content}
                anchorId={anchorId}
                number={index + 1}
              />
            </div>
          ))}
        </div>
      )}

      {faqs.length > 0 && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            {sectionNumbers.FAQS}. Frequently Asked Questions
          </span>
          <BuyingGuideFaqAccordion faqs={faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))} />
        </div>
      )}

      <AffiliateDisclosure text={settings?.affiliateDisclosure} />
    </div>
  );
}

export default LivePreview;
