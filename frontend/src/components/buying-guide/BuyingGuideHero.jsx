import { getImageUrl } from '../../utils/imageUrl.js';

function formatUpdatedDate(updatedAt) {
  if (!updatedAt) return null;
  return new Date(updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function BuyingGuideHero({ title, excerpt, coverImageFilename, updatedAt }) {
  const imageUrl = getImageUrl(coverImageFilename);
  const formattedDate = formatUpdatedDate(updatedAt);

  return (
    <div className="rounded-card border border-border bg-white p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
            BUYING GUIDE
          </span>
          <h1 className="mb-3 text-page-heading text-heading">{title}</h1>
          {excerpt && <p className="mb-4 text-body">{excerpt}</p>}
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              2G
            </span>
            <span>
              By 2Go Findz Team{formattedDate ? ` · Updated ${formattedDate}` : ''}
            </span>
          </div>
        </div>
        {imageUrl && (
          <div className="aspect-video overflow-hidden rounded-image bg-surface-secondary">
            <img src={imageUrl} alt={title} loading="eager" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}

export default BuyingGuideHero;
