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
      className="relative overflow-hidden bg-surface-secondary py-16 sm:py-20 lg:flex lg:min-h-[620px] lg:items-center lg:bg-[image:var(--hero-image)] lg:bg-cover lg:bg-right lg:bg-no-repeat lg:py-0"
      style={{ '--hero-image': `url(${HOME_HERO_IMAGE})` }}
    >
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amazon bg-white px-4 py-1.5 text-small font-semibold uppercase tracking-wide text-amazon">
            <Sparkles size={16} aria-hidden="true" />
            {badge}
          </span>
          <h1 className="mt-6 text-hero text-heading">
            <span className="block">{first}</span>
            {rest && <span className="block text-amazon">{rest}</span>}
          </h1>
          <p className="mt-6 max-w-xl text-subtitle text-body">{description}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button variant="primary" to="/trending">
              View Trending Finds
            </Button>
            <Button variant="secondary" to="/categories">
              Browse Categories
            </Button>
          </div>
        </div>

        <img
          src={HOME_HERO_IMAGE}
          alt=""
          loading="eager"
          className="mt-10 aspect-[1817/866] w-full rounded-card object-cover shadow-card-hover lg:hidden"
        />
      </div>
    </section>
  );
}

export default HomeHero;
