import { motion } from 'framer-motion';
import Button from './Button.jsx';

function HeroSection({ headline, description, onExploreClick, onTrendingClick }) {
  return (
    <section className="relative overflow-hidden bg-surface-secondary py-16 sm:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{ y: [0, -16, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-10 -top-10 h-32 w-32 sm:-left-16 sm:-top-16 sm:h-80 sm:w-80"
        >
          <div className="absolute inset-0 rounded-full bg-amazon/40 blur-3xl" />
          <div
            className="absolute inset-6 rounded-full shadow-[0_30px_60px_-15px_rgba(255,153,0,0.5)]"
            style={{
              background: 'radial-gradient(circle at 32% 28%, #FFE3A3 0%, #FF9900 55%, #B86800 100%)',
            }}
          />
        </motion.div>

        <motion.div
          animate={{ y: [0, 18, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="absolute -right-10 -top-6 h-24 w-24 sm:-right-14 sm:top-1/4 sm:h-72 sm:w-72"
        >
          <div className="absolute inset-0 rounded-full bg-[#2C8C99]/35 blur-3xl" />
          <div
            className="absolute inset-6 rounded-full shadow-[0_30px_60px_-15px_rgba(44,140,153,0.5)]"
            style={{
              background: 'radial-gradient(circle at 32% 28%, #A6E4E9 0%, #2C8C99 55%, #114950 100%)',
            }}
          />
        </motion.div>

        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-12 left-4 h-24 w-24 sm:bottom-[-5rem] sm:left-1/3 sm:h-80 sm:w-80"
        >
          <div className="absolute inset-0 rounded-full bg-amazon/25 blur-3xl" />
          <div
            className="absolute inset-8 rounded-full opacity-80 shadow-[0_30px_60px_-15px_rgba(255,153,0,0.4)]"
            style={{
              background: 'radial-gradient(circle at 32% 28%, #FFE3A3 0%, #FF9900 55%, #B86800 100%)',
            }}
          />
        </motion.div>
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
