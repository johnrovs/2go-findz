import { ExternalLink } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl.js';
import { recordClick } from '../../services/trackingService.js';

function BrowseProductListItem({ product }) {
  const imageUrl = getImageUrl(product.imageFileName);

  function handleClick() {
    const sessionId = sessionStorage.getItem('sessionId');
    recordClick(product.id, sessionId).catch(() => {
      // Click tracking is best-effort; never block the link's native navigation on a tracking failure.
    });
  }

  return (
    <article className="flex items-center gap-4 rounded-card border border-border bg-white p-3">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-50">
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">No image</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-semibold text-heading">{product.name}</p>
        <p className="text-xs text-text-secondary">{product.categoryName}</p>
        {product.description && (
          <p className="mt-1 line-clamp-2 text-xs text-body">{product.description}</p>
        )}
      </div>

      <a
        href={product.productLink}
        onClick={handleClick}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        aria-label={`View ${product.name} on Amazon`}
        className="flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-white px-4 text-sm font-medium text-navy-950 transition hover:bg-slate-50"
      >
        View on Amazon
        <ExternalLink size={14} aria-hidden="true" />
      </a>
    </article>
  );
}

export default BrowseProductListItem;
