import { motion } from 'framer-motion';
import Button from './Button.jsx';

function HeroSection({ headline, description, onExploreClick, onTrendingClick }) {
  return (
    <section className="relative overflow-hidden bg-surface-secondary py-16 sm:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-amazon/25 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full bg-primary/20 blur-3xl sm:h-96 sm:w-96" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-hero text-heading"
        >
          {headline}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mx-auto mt-6 max-w-2xl text-subtitle text-body"
        >
          {description}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <Button variant="primary" onClick={onExploreClick}>
            Explore Products
          </Button>
          <Button variant="secondary" onClick={onTrendingClick}>
            View Trending Finds
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;
