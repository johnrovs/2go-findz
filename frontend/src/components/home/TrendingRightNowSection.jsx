import CompactProductRow from './CompactProductRow.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { recordClick } from '../../services/trackingService.js';

function TrendingRightNowSection({ products }) {
  if (products.length === 0) return null;

  const [featured, ...rest] = products;
  const rows = rest.slice(0, 3);
  const imageUrl = getImageUrl(featured.imageFileName);

  function handleFeaturedClick() {
    const sessionId = sessionStorage.getItem('sessionId');
    recordClick(featured.id, sessionId).catch(() => {
      // Click tracking is best-effort; never block the link's native navigation on a tracking failure.
    });
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        {rows.map((product) => (
          <CompactProductRow key={product.id} product={product} />
        ))}
      </div>

      <a
        href={featured.productLink}
        onClick={handleFeaturedClick}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        aria-label={featured.name}
        className="group block overflow-hidden rounded-card bg-slate-100"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center text-sm text-slate-400">
            No image available
          </div>
        )}
      </a>
    </div>
  );
}

export default TrendingRightNowSection;
