import { Sparkles } from 'lucide-react';
import Button from '../Button.jsx';
import { HOME_HERO_CONTENT, HOME_HERO_IMAGE } from '../../config/homeContent.js';

function splitHeadline(headline) {
  const periodIndex = headline.indexOf('.');
  if (periodIndex === -1) return { first: headline, rest: '' };
  return {
    first: headline.slice(0, periodIndex + 1).trim(),
    rest: headline.slice(periodIndex + 1).trim(),
  };
}

function HomeHero({ headline, description }) {
  const { badge } = HOME_HERO_CONTENT;
  const { first, rest } = splitHeadline(headline);

  return (
    <section
      className="relative flex min-h-[480px] items-center overflow-hidden bg-surface-secondary bg-[image:var(--hero-image)] bg-cover bg-center bg-no-repeat py-16 sm:min-h-[560px] sm:py-20 lg:min-h-[620px] lg:py-0"
      style={{ '--hero-image': `url(${HOME_HERO_IMAGE})` }}
    >
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amazon bg-white px-4 py-1.5 text-small font-semibold uppercase tracking-wide text-amazon">
            <Sparkles size={16} aria-hidden="true" />
            {badge}
          </span>
          <h1 className="mt-6 text-hero text-heading">
            <span className="block">{first}</span>
            {rest && <span className="block text-amazon">{rest}</span>}
          </h1>
          <p className="mt-6 max-w-xl text-subtitle text-body">{description}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button variant="primary" to="/trending">
              View Trending Finds
            </Button>
            <Button variant="secondary" to="/categories">
              Browse Categories
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HomeHero;
