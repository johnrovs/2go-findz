import { useState } from 'react';
import { Image as ImageIcon, Monitor, Smartphone } from 'lucide-react';
import AffiliateDisclosure from '../AffiliateDisclosure.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { STRUCTURAL_LABELS } from './TocBuilder.jsx';

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function LivePreview({ title, excerpt, coverImageFilename, tocEntries, settings }) {
  const [device, setDevice] = useState('desktop');
  const previewUrl = getImageUrl(coverImageFilename);
  const visibleEntries = tocEntries.filter((entry) => entry.visible);

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

      <AffiliateDisclosure text={settings?.affiliateDisclosure} />
    </div>
  );
}

export default LivePreview;
