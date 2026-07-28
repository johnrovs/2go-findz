import { motion } from 'framer-motion';
import { Check, GitCompare } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl.js';
import { recordClick } from '../services/trackingService.js';
import { useCompare } from '../hooks/useCompare.js';

function ProductCard({ product }) {
  const imageUrl = getImageUrl(product.imageFileName);
  const { isSelected, isFull, toggle } = useCompare();
  const selected = isSelected(product.id);

  function handleCheckPrice() {
    const sessionId = sessionStorage.getItem('sessionId');
    recordClick(product.id, sessionId).catch(() => {
      // Click tracking is best-effort; never block the link's native navigation on a tracking failure.
    });
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3 }}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            No image available
          </div>
        )}
        <button
          type="button"
          onClick={() => toggle(product.id)}
          disabled={!selected && isFull}
          aria-pressed={selected}
          aria-label={selected ? `Remove ${product.name} from Compare` : `Add ${product.name} to Compare`}
          title={!selected && isFull ? 'Compare is full — remove an item to add another' : undefined}
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
            selected ? 'bg-indigo-600 text-white' : 'bg-white/90 text-slate-600 hover:bg-white'
          }`}
        >
          {selected ? <Check size={16} /> : <GitCompare size={16} />}
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center gap-2 p-4 text-center">
        <h3 className="text-base font-semibold text-slate-900">{product.name}</h3>
        <p className="line-clamp-3 text-sm text-slate-600">{product.description}</p>
        <a
          href={product.productLink}
          onClick={handleCheckPrice}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="mt-auto inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Check Price
        </a>
      </div>
    </motion.article>
  );
}

export default ProductCard;
