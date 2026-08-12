import { ExternalLink } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl.js';
import { recordClick } from '../../services/trackingService.js';

function BrowseProductCard({ product }) {
  const imageUrl = getImageUrl(product.imageFileName);

  function handleClick() {
    const sessionId = sessionStorage.getItem('sessionId');
    recordClick(product.id, sessionId).catch(() => {
      // Click tracking is best-effort; never block the link's native navigation on a tracking failure.
    });
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-border bg-white">
      <div className="flex aspect-square items-center justify-center overflow-hidden bg-slate-50">
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            No image available
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-semibold text-heading">{product.name}</p>
        <p className="text-xs text-text-secondary">{product.categoryName}</p>

        <a
          href={product.productLink}
          onClick={handleClick}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          aria-label={`View ${product.name} on Amazon`}
          className="mt-auto flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-white text-sm font-medium text-navy-950 transition hover:bg-slate-50"
        >
          View on Amazon
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export default BrowseProductCard;
