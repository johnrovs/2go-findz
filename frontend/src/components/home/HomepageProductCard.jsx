import { getImageUrl } from '../../utils/imageUrl.js';
import { recordClick } from '../../services/trackingService.js';

function HomepageProductCard({ product }) {
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
      className="group flex w-full flex-col bg-white transition-opacity duration-200 hover:opacity-90"
    >
      <div className="aspect-square overflow-hidden rounded-card bg-slate-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            No image available
          </div>
        )}
      </div>
      <p className="pt-3 text-left text-small font-medium text-heading">{product.name}</p>
    </a>
  );
}

export default HomepageProductCard;
