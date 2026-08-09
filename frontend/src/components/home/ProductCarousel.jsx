import { useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import HomepageProductCard from './HomepageProductCard.jsx';

function ProductCarousel({ products }) {
  const scrollRef = useRef(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(products.length > 1);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 0);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  function scrollByCard(direction) {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('[data-carousel-item]');
    const step = card ? card.getBoundingClientRect().width + 16 : el.clientWidth;
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  if (products.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
      >
        {products.map((product) => (
          <div key={product.id} data-carousel-item className="w-[220px] shrink-0 snap-start">
            <HomepageProductCard product={product} />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          disabled={!canScrollPrev}
          aria-label="Scroll to previous products"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => scrollByCard(1)}
          disabled={!canScrollNext}
          aria-label="Scroll to next products"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default ProductCarousel;
