import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import HeroSlide from './HeroSlide.jsx';
import HeroSection from './HeroSection.jsx';
import { getImageUrl } from '../utils/imageUrl.js';

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD_PX = 50;

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    function handleChange(event) {
      setPrefersReducedMotion(event.matches);
    }
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

function HeroCarousel({ banners, heroSectionProps }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const slideCount = banners.length;

  useEffect(() => {
    if (slideCount <= 1 || isPaused || prefersReducedMotion) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [slideCount, isPaused, prefersReducedMotion]);

  if (slideCount === 0) {
    return <HeroSection {...heroSectionProps} />;
  }

  const activeBanner = banners[activeIndex];
  const slideProps = (banner, isPriority) => ({
    imageUrl: getImageUrl(banner.imageFilename),
    imageAlt: banner.imageAlt,
    badge: banner.badge,
    headline: banner.headline,
    description: banner.description,
    buttonText: banner.buttonText,
    buttonTo: banner.buttonLink,
    isPriority,
  });

  if (slideCount === 1) {
    return <HeroSlide {...slideProps(activeBanner, true)} />;
  }

  function goToSlide(index) {
    setActiveIndex(((index % slideCount) + slideCount) % slideCount);
  }

  function handleTouchStart(event) {
    touchStartXRef.current = event.touches[0].clientX;
  }

  function handleTouchEnd(event) {
    if (touchStartXRef.current === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (deltaX > SWIPE_THRESHOLD_PX) {
      goToSlide(activeIndex - 1);
    } else if (deltaX < -SWIPE_THRESHOLD_PX) {
      goToSlide(activeIndex + 1);
    }
  }

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence>
        <motion.div
          key={activeBanner.id}
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
        >
          <HeroSlide {...slideProps(activeBanner, activeIndex === 0)} />
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        onClick={() => goToSlide(activeIndex - 1)}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-900 shadow-md transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        onClick={() => goToSlide(activeIndex + 1)}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-900 shadow-md transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <ChevronRight size={20} />
      </button>

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {banners.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === activeIndex ? 'true' : undefined}
            className={`h-2.5 w-2.5 rounded-full transition ${index === activeIndex ? 'bg-white' : 'bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
}

export default HeroCarousel;
