import { useState } from 'react';
import { Award, Check, ChevronDown, Image as ImageIcon, Medal, Monitor, Smartphone, X } from 'lucide-react';
import AffiliateDisclosure from '../AffiliateDisclosure.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { STRUCTURAL_LABELS } from './TocBuilder.jsx';
import QuickPickBadge from './QuickPickBadge.jsx';
import { isSupportedAmazonUrl } from '../../utils/amazonLink.js';
import { wordCount } from './RichTextEditor.jsx';

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function computeSectionNumbers({
  tocEntries,
  hasQuickRecommendations,
  hasComparison,
  hasTopPick,
  hasRunnerUps,
  hasBuyingGuideContent,
  hasFaqs,
}) {
  const contentBySectionKey = {
    QUICK_RECOMMENDATIONS: hasQuickRecommendations,
    COMPARISON_TABLE: hasComparison,
    TOP_PICK: hasTopPick,
    RUNNER_UPS: hasRunnerUps,
    FAQS: hasFaqs,
  };
  const numbers = {};
  let nextNumber = 1;
  let buyingGuideNumbered = false;
  tocEntries.forEach((entry) => {
    if (entry.sectionKey) {
      if (entry.visible && contentBySectionKey[entry.sectionKey]) {
        numbers[entry.sectionKey] = nextNumber;
        nextNumber += 1;
      }
      return;
    }
    if (!buyingGuideNumbered && hasBuyingGuideContent && entry.visible) {
      numbers.BUYING_GUIDE = nextNumber;
      nextNumber += 1;
      buyingGuideNumbered = true;
    }
  });
  return numbers;
}

function renderRecommendationCard(section, number) {
  const imageUrl = getImageUrl(section.product.imageFileName);
  const linkSupported = isSupportedAmazonUrl(section.product.productLink);
  const isTopPick = section.recommendationType === 'TOP_PICK';
  return (
    <div key={section.clientId} className={`rounded-btn border border-border p-3 ${isTopPick ? '' : 'mt-3'}`}>
      <div className="mb-2 flex items-center gap-2">
        {!isTopPick && <span className="text-xs font-semibold text-muted">#{number}</span>}
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {isTopPick ? <Award size={12} /> : <Medal size={12} />}
          {section.sectionLabel || 'Untitled Badge'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-surface-secondary">
          {imageUrl && <img src={imageUrl} alt={section.product.name} className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0">
          <a href={`#product-${section.product.id}`} className="truncate text-sm font-semibold text-heading hover:underline">
            {section.product.name}
          </a>
          {section.product.rating != null && (
            <p className="text-xs text-muted">
              ★ {section.product.rating} ({section.product.reviewCount?.toLocaleString() ?? 0})
            </p>
          )}
          <p className="text-sm font-semibold text-heading">${Number(section.product.productPrice).toFixed(2)}</p>
        </div>
      </div>
      {linkSupported ? (
        <a
          href={section.product.productLink}
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
      <div className="prose prose-sm mt-2 max-w-none text-body" dangerouslySetInnerHTML={{ __html: section.whyRecommended }} />
      {section.pros.length > 0 && (
        <ul className="mt-2 space-y-1">
          {section.pros.map((item) => (
            <li key={item.clientId} className="flex items-start gap-1 text-xs text-body">
              <Check size={12} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
              {item.content}
            </li>
          ))}
        </ul>
      )}
      {section.cons.length > 0 && (
        <ul className="mt-2 space-y-1">
          {section.cons.map((item) => (
            <li key={item.clientId} className="flex items-start gap-1 text-xs text-body">
              <X size={12} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
              {item.content}
            </li>
          ))}
        </ul>
      )}
      {section.bestFor.length > 0 && (
        <div className="mt-2">
          <span className="text-xs font-semibold text-heading">Best For</span>
          <ul className="list-disc pl-4 text-xs text-body">
            {section.bestFor.map((item) => (
              <li key={item.clientId}>{item.content}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const CONTENT_PREVIEW_WORD_LIMIT = 40;

function BuyingGuideSectionPreviewCard({ entry, number, anchorId }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = wordCount(entry.content) > CONTENT_PREVIEW_WORD_LIMIT;

  return (
    <div id={anchorId} className={`rounded-btn border border-border p-3 ${number > 1 ? 'mt-3' : ''}`}>
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted">
          {number}
        </span>
        <span className="text-sm font-semibold text-heading">{entry.title || 'Untitled Section'}</span>
      </div>
      <div
        className={`prose prose-sm max-w-none text-body ${!isExpanded && isLong ? 'line-clamp-4' : ''}`}
        dangerouslySetInnerHTML={{ __html: entry.content }}
      />
      {isLong && (
        <button
          type="button"
          onClick={() => setIsExpanded((open) => !open)}
          className="mt-1 text-xs font-semibold text-primary hover:underline"
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

const FAQ_PREVIEW_LIMIT = 5;

function FaqAccordionPreview({ faqs }) {
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [showAll, setShowAll] = useState(false);
  const visibleFaqs = showAll ? faqs : faqs.slice(0, FAQ_PREVIEW_LIMIT);

  function toggle(clientId) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {visibleFaqs.map((faq, index) => {
        const isExpanded = expandedIds.has(faq.clientId);
        return (
          <div key={faq.clientId} className="rounded-btn border border-border p-3">
            <button
              type="button"
              onClick={() => toggle(faq.clientId)}
              aria-expanded={isExpanded}
              aria-controls={`faq-preview-answer-${faq.clientId}`}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-heading">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted">
                  {index + 1}
                </span>
                {faq.question || 'Untitled question'}
              </span>
              <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
              <p id={`faq-preview-answer-${faq.clientId}`} className="mt-2 whitespace-pre-line text-sm text-body">
                {faq.answer}
              </p>
            )}
          </div>
        );
      })}
      {faqs.length > FAQ_PREVIEW_LIMIT && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {showAll ? 'Show fewer questions' : `View all ${faqs.length} questions`}
        </button>
      )}
    </div>
  );
}

function renderComparisonCellValue(rawValue) {
  const value = (rawValue ?? '').trim();
  if (!value) return <span aria-hidden="true">&mdash;</span>;
  const lower = value.toLowerCase();
  if (lower === 'yes') {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <Check size={16} aria-hidden="true" />
        <span className="sr-only">Yes</span>
      </span>
    );
  }
  if (lower === 'no') {
    return (
      <span className="inline-flex items-center gap-1 text-danger">
        <X size={16} aria-hidden="true" />
        <span className="sr-only">No</span>
      </span>
    );
  }
  return value;
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

  const sectionNumbers = computeSectionNumbers({
    tocEntries,
    hasQuickRecommendations: quickRecommendations.length > 0,
    hasComparison: comparisonSpecs.length > 0 && comparisonProducts.length > 0,
    hasTopPick: Boolean(topPick),
    hasRunnerUps: runnerUps.length > 0,
    hasBuyingGuideContent,
    hasFaqs: faqs.length > 0,
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
        <div className="mb-4 overflow-x-auto">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            {sectionNumbers.COMPARISON_TABLE}. Comparison Table
          </span>
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Comparison of {comparisonProducts.map((product) => product.name).join(', ')}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="border-b border-border p-2 text-left text-xs font-semibold text-muted">
                  Feature
                </th>
                {comparisonProducts.map((product) => {
                  const imageUrl = getImageUrl(product.imageFileName);
                  return (
                    <th key={product.id} scope="col" className="border-b border-border p-2 text-center">
                      <div className="mx-auto mb-1 h-10 w-10 overflow-hidden rounded-md bg-surface-secondary">
                        {imageUrl && <img src={imageUrl} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <span className="text-xs font-semibold text-heading">{product.name}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {comparisonSpecs.map((spec) => (
                <tr key={spec.clientId}>
                  <th scope="row" className="border-b border-border p-2 text-left text-xs font-medium text-body">
                    {spec.specificationName || 'Untitled Specification'}
                  </th>
                  {comparisonProducts.map((product) => {
                    const cell = spec.values.find((v) => v.productId === product.id);
                    return (
                      <td key={product.id} className="border-b border-border p-2 text-center text-xs text-body">
                        {renderComparisonCellValue(cell?.value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {topPick && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            {sectionNumbers.TOP_PICK}. Our Top Pick
          </span>
          {renderRecommendationCard(topPick, null)}
        </div>
      )}

      {runnerUps.length > 0 && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            {sectionNumbers.RUNNER_UPS}. Runner-Ups
          </span>
          {runnerUps.map((section, index) => renderRecommendationCard(section, index + 1))}
        </div>
      )}

      {hasBuyingGuideContent && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            {sectionNumbers.BUYING_GUIDE}. Buying Guide
          </span>
          {customSectionsWithAnchors.map(({ entry, anchorId }, index) => (
            <BuyingGuideSectionPreviewCard key={entry.clientId} entry={entry} number={index + 1} anchorId={anchorId} />
          ))}
        </div>
      )}

      {faqs.length > 0 && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            {sectionNumbers.FAQS}. Frequently Asked Questions
          </span>
          <FaqAccordionPreview faqs={faqs} />
        </div>
      )}

      <AffiliateDisclosure text={settings?.affiliateDisclosure} />
    </div>
  );
}

export default LivePreview;
