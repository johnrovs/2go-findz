import { Check, AlertTriangle } from 'lucide-react';
import KeywordTagInput from './KeywordTagInput.jsx';
import SearchResultPreview from './SearchResultPreview.jsx';

function CounterIcon({ inRange }) {
  return inRange ? <Check size={14} className="text-success" /> : <AlertTriangle size={14} className="text-warning" />;
}

function SeoSettingsForm({
  seoTitleDisplay,
  isSeoTitleCustom,
  onSeoTitleChange,
  onResetSeoTitle,
  metaDescriptionDisplay,
  isMetaDescriptionCustom,
  onMetaDescriptionChange,
  onResetMetaDescription,
  focusKeyword,
  onFocusKeywordChange,
  focusKeywordAnalysis,
  supportingKeywords,
  onSupportingKeywordsChange,
  canonicalUrl,
  onCanonicalUrlChange,
  canonicalError,
  canonicalWarning,
  guideUrl,
}) {
  const titleLength = seoTitleDisplay.length;
  const descriptionLength = metaDescriptionDisplay.length;
  const titleInRange = titleLength >= 50 && titleLength <= 60;
  const descriptionInRange = descriptionLength >= 140 && descriptionLength <= 160;

  return (
    <div className="rounded-card border border-border bg-white p-5">
      <h2 className="mb-4 text-card-title text-heading">SEO Settings</h2>

      <div className="mb-5">
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="seo-title" className="block text-small font-medium text-body">
            SEO Title *
          </label>
          {isSeoTitleCustom && (
            <button type="button" onClick={onResetSeoTitle} className="text-xs text-primary hover:underline">
              Reset to guide title
            </button>
          )}
        </div>
        <input
          id="seo-title"
          type="text"
          maxLength={70}
          value={seoTitleDisplay}
          onChange={(event) => onSeoTitleChange(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-muted">
            Keep the title concise and descriptive. Search engines may display a shortened version.
          </p>
          <span className="flex items-center gap-1 text-xs text-muted">
            <CounterIcon inRange={titleInRange} />
            {titleLength} / 60
          </span>
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="meta-description" className="block text-small font-medium text-body">
            Meta Description *
          </label>
          {isMetaDescriptionCustom && (
            <button type="button" onClick={onResetMetaDescription} className="text-xs text-primary hover:underline">
              Reset to guide excerpt
            </button>
          )}
        </div>
        <textarea
          id="meta-description"
          rows={3}
          maxLength={200}
          value={metaDescriptionDisplay}
          onChange={(event) => onMetaDescriptionChange(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-muted">
            Write a concise summary for search results. Search engines may display different text depending on the
            query.
          </p>
          <span className="flex items-center gap-1 text-xs text-muted">
            <CounterIcon inRange={descriptionInRange} />
            {descriptionLength} / 160
          </span>
        </div>
      </div>

      <div className="mb-5">
        <label htmlFor="focus-keyword" className="mb-1 block text-small font-medium text-body">
          Focus Keyword *
        </label>
        <input
          id="focus-keyword"
          type="text"
          value={focusKeyword}
          onChange={(event) => onFocusKeywordChange(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="mt-1 text-xs text-muted">Choose the main search phrase this guide is intended to address.</p>
        {focusKeyword.trim() && (
          <ul className="mt-2 flex flex-wrap gap-3 text-xs">
            <li className={focusKeywordAnalysis.inTitle ? 'text-success' : 'text-muted'}>
              {focusKeywordAnalysis.inTitle ? '✓' : '✗'} Title
            </li>
            <li className={focusKeywordAnalysis.inDescription ? 'text-success' : 'text-muted'}>
              {focusKeywordAnalysis.inDescription ? '✓' : '✗'} Description
            </li>
            <li className={focusKeywordAnalysis.inSlug ? 'text-success' : 'text-muted'}>
              {focusKeywordAnalysis.inSlug ? '✓' : '✗'} Slug
            </li>
            <li className={focusKeywordAnalysis.inContent ? 'text-success' : 'text-muted'}>
              {focusKeywordAnalysis.inContent ? '✓' : '✗'} Content
            </li>
          </ul>
        )}
      </div>

      <div className="mb-5">
        <label htmlFor="seo-keywords" className="mb-1 block text-small font-medium text-body">
          SEO Keywords
        </label>
        <KeywordTagInput id="seo-keywords" keywords={supportingKeywords} onChange={onSupportingKeywordsChange} />
      </div>

      <div className="mb-5">
        <label htmlFor="canonical-url" className="mb-1 block text-small font-medium text-body">
          Canonical URL
        </label>
        <input
          id="canonical-url"
          type="text"
          value={canonicalUrl}
          onChange={(event) => onCanonicalUrlChange(event.target.value)}
          placeholder={guideUrl}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="mt-1 text-xs text-muted">
          Use this only when another URL should be treated as the preferred version of this content.
        </p>
        {canonicalError && <p className="mt-1 text-sm text-danger">{canonicalError}</p>}
        {!canonicalError && canonicalWarning && <p className="mt-1 text-sm text-warning">{canonicalWarning}</p>}
      </div>

      <SearchResultPreview seoTitle={seoTitleDisplay} metaDescription={metaDescriptionDisplay} url={canonicalUrl || guideUrl} />
    </div>
  );
}

export default SeoSettingsForm;
