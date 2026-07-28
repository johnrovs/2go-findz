import { motion } from 'framer-motion';
import Button from './Button.jsx';

function HeroSection({ headline, description, onExploreClick, onTrendingClick }) {
  return (
    <section className="bg-surface-secondary py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
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
