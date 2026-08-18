import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getImageUrl } from '../../utils/imageUrl.js';
import AffiliateDisclosure from '../AffiliateDisclosure.jsx';

function formatUpdatedDate(updatedAt, locale) {
  if (!updatedAt) return null;
  return new Date(updatedAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

function BuyingGuideHero({ title, excerpt, coverImageFilename, updatedAt, affiliateDisclosure }) {
  const { t, i18n } = useTranslation('guides');
  const imageUrl = getImageUrl(coverImageFilename);
  const formattedDate = formatUpdatedDate(updatedAt, i18n.language);

  return (
    <div className="rounded-card border border-border bg-white p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col justify-center">
          <span className="mb-3 inline-block self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
            {t('hero.badge')}
          </span>
          <h1 className="mb-3 text-page-heading text-heading">{title}</h1>
          {excerpt && <p className="mb-4 text-body">{excerpt}</p>}
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
              2G
            </span>
            <span>
              {t('hero.byline')}{formattedDate ? ` · ${t('hero.updatedOn', { date: formattedDate })}` : ''}
            </span>
          </div>
          <div className="mt-4 inline-flex items-start gap-2 rounded-lg bg-surface-secondary px-3 py-2">
            <Info size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <AffiliateDisclosure text={affiliateDisclosure} className="text-xs leading-relaxed text-muted" />
          </div>
        </div>
        {imageUrl && (
          <div className="order-first aspect-[3/4] overflow-hidden rounded-image bg-surface-secondary lg:order-none">
            <img src={imageUrl} alt={title} loading="eager" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}

export default BuyingGuideHero;
