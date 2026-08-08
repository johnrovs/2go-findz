import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ImageUploader from '../ImageUploader.jsx';

const TWITTER_CARD_TYPES = [
  { value: 'summary', label: 'Summary' },
  { value: 'summary_large_image', label: 'Summary with Large Image' },
];

function AdvancedSeoPanel({ values, onChange, seoTitleFallback, metaDescriptionFallback, coverImageFilenameFallback }) {
  const [isOpen, setIsOpen] = useState(false);

  function set(field, value) {
    onChange({ ...values, [field]: value });
  }

  return (
    <div className="rounded-card border border-border bg-white p-5">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="advanced-seo-panel"
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h3 className="text-card-title text-heading">Advanced SEO (Optional)</h3>
          <p className="text-sm text-muted">
            Add structured data, robots settings, social metadata, and other advanced SEO options.
          </p>
        </div>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isOpen && (
        <div id="advanced-seo-panel" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                checked={values.robotsIndex}
                onChange={(event) => set('robotsIndex', event.target.checked)}
              />
              Allow search engines to index this guide
            </label>
            <label className="flex items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                checked={values.robotsFollow}
                onChange={(event) => set('robotsFollow', event.target.checked)}
              />
              Allow search engines to follow links on this guide
            </label>
          </div>

          <div>
            <label htmlFor="og-title" className="mb-1 block text-small font-medium text-body">
              Open Graph Title
            </label>
            <input
              id="og-title"
              type="text"
              value={values.openGraphTitle}
              onChange={(event) => set('openGraphTitle', event.target.value)}
              placeholder={seoTitleFallback}
              className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted">Falls back to the SEO Title when left blank.</p>
          </div>

          <div>
            <label htmlFor="og-description" className="mb-1 block text-small font-medium text-body">
              Open Graph Description
            </label>
            <textarea
              id="og-description"
              rows={2}
              value={values.openGraphDescription}
              onChange={(event) => set('openGraphDescription', event.target.value)}
              placeholder={metaDescriptionFallback}
              className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted">Falls back to the Meta Description when left blank.</p>
          </div>

          <ImageUploader
            imageFileName={values.openGraphImageFilename || coverImageFilenameFallback}
            onChange={(value) => set('openGraphImageFilename', value)}
            label="Open Graph Image"
            variant="wide"
            helperText="Falls back to the Featured Image when left blank."
          />

          <div>
            <label htmlFor="twitter-card-type" className="mb-1 block text-small font-medium text-body">
              X/Twitter Card Type
            </label>
            <select
              id="twitter-card-type"
              value={values.twitterCardType}
              onChange={(event) => set('twitterCardType', event.target.value)}
              className="w-full rounded-btn border border-border bg-white px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {TWITTER_CARD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdvancedSeoPanel;
