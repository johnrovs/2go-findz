import { useState } from 'react';
import { Award, Check, Image as ImageIcon, Medal, Monitor, Smartphone, X } from 'lucide-react';
import AffiliateDisclosure from '../AffiliateDisclosure.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { STRUCTURAL_LABELS } from './TocBuilder.jsx';
import QuickPickBadge from './QuickPickBadge.jsx';
import { isSupportedAmazonUrl } from '../../utils/amazonLink.js';

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function computeSectionNumbers({ tocEntries, hasQuickRecommendations, hasComparison, hasTopPick, hasRunnerUps }) {
  const contentBySectionKey = {
    QUICK_RECOMMENDATIONS: hasQuickRecommendations,
    COMPARISON_TABLE: hasComparison,
    TOP_PICK: hasTopPick,
    RUNNER_UPS: hasRunnerUps,
  };
  const orderedKeys = tocEntries
    .filter((entry) => entry.visible && entry.sectionKey && contentBySectionKey[entry.sectionKey])
    .map((entry) => entry.sectionKey);
  const numbers = {};
  orderedKeys.forEach((key, index) => {
    numbers[key] = index + 1;
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
}) {
  const [device, setDevice] = useState('desktop');
  const previewUrl = getImageUrl(coverImageFilename);
  const visibleEntries = tocEntries.filter((entry) => entry.visible);
  const topPick = recommendationSections.find((s) => s.recommendationType === 'TOP_PICK') ?? null;
  const runnerUps = recommendationSections.filter((s) => s.recommendationType === 'RUNNER_UP');
  const sectionNumbers = computeSectionNumbers({
    tocEntries,
    hasQuickRecommendations: quickRecommendations.length > 0,
    hasComparison: comparisonSpecs.length > 0 && comparisonProducts.length > 0,
    hasTopPick: Boolean(topPick),
    hasRunnerUps: runnerUps.length > 0,
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
            {visibleEntries.map((entry, index) => (
              <li key={entry.clientId} className="flex items-center gap-2 text-sm text-primary">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span>{entry.sectionKey ? STRUCTURAL_LABELS[entry.sectionKey] : entry.title || 'Untitled Section'}</span>
              </li>
            ))}
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

      <AffiliateDisclosure text={settings?.affiliateDisclosure} />
    </div>
  );
}

export default LivePreview;
