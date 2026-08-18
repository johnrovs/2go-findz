import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { wordCount } from '../../utils/wordCount.js';

const CONTENT_PREVIEW_WORD_LIMIT = 40;

function BuyingGuideContentCard({ title, content, anchorId, number, onExpand }) {
  const { t } = useTranslation('guides');
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = wordCount(content) > CONTENT_PREVIEW_WORD_LIMIT;

  function toggle() {
    const willExpand = !isExpanded;
    setIsExpanded(willExpand);
    if (willExpand) onExpand?.(title);
  }

  return (
    <div id={anchorId} className="scroll-mt-24 rounded-card border border-border bg-white p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted">
          {number}
        </span>
        <h3 className="text-card-title text-heading">{title}</h3>
      </div>
      <div
        className={`prose prose-sm max-w-none text-body ${!isExpanded && isLong ? 'line-clamp-4' : ''}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      {isLong && (
        <button type="button" onClick={toggle} className="mt-2 text-sm font-semibold text-primary hover:underline">
          {isExpanded ? t('content.showLess') : t('content.readMore')}
        </button>
      )}
    </div>
  );
}

export default BuyingGuideContentCard;
