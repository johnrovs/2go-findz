import { getImageUrl } from '../../utils/imageUrl.js';
import { recordClick } from '../../services/trackingService.js';

function CompactProductRow({ product }) {
  const imageUrl = getImageUrl(product.imageFileName);

  function handleClick() {
    const sessionId = sessionStorage.getItem('sessionId');
    recordClick(product.id, sessionId).catch(() => {
      // Click tracking is best-effort; never block the link's native navigation on a tracking failure.
    });
  }

  return (
    <a
      href={product.productLink}
      onClick={handleClick}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      className="flex items-center gap-3 rounded-btn p-2 transition hover:bg-surface-secondary"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-btn bg-slate-100">
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">No image</div>
        )}
      </div>
      <span className="text-small font-medium text-heading">{product.name}</span>
    </a>
  );
}

export default CompactProductRow;
