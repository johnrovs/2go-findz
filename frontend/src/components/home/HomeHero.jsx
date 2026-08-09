import { Sparkles, Star } from 'lucide-react';
import Button from '../Button.jsx';
import HeroTrustCard from './HeroTrustCard.jsx';
import { HOME_HERO_CONTENT, HOME_HERO_IMAGE } from '../../config/homeContent.js';

const AVATAR_INITIALS = ['A', 'M', 'S', 'K'];

function HomeHero({ headline, description }) {
  const { badge, shopperCountLabel, trustCards } = HOME_HERO_CONTENT;

  return (
    <section className="relative overflow-hidden bg-surface-secondary py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-small font-semibold uppercase tracking-wide text-primary">
            <Sparkles size={16} aria-hidden="true" />
            {badge}
          </span>
          <h1 className="mt-6 text-hero text-heading">{headline}</h1>
          <p className="mt-6 max-w-xl text-subtitle text-body">{description}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button variant="primary" to="/trending">
              View Trending Finds
            </Button>
            <Button variant="secondary" to="/categories">
              Browse Categories
            </Button>
          </div>
          <div className="mt-10 flex items-center gap-3">
            <div className="flex -space-x-3" aria-hidden="true">
              {AVATAR_INITIALS.map((initial, index) => (
                <span
                  key={initial}
                  style={{ zIndex: AVATAR_INITIALS.length - index }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary text-small font-semibold text-white"
                >
                  {initial}
                </span>
              ))}
            </div>
            <p className="text-small text-body">{shopperCountLabel}</p>
          </div>
        </div>

        <div className="relative">
          <img
            src={HOME_HERO_IMAGE}
            alt=""
            loading="eager"
            width={640}
            height={640}
            className="aspect-square w-full rounded-card object-cover shadow-card-hover"
          />
          <div className="absolute -left-4 top-8 hidden w-64 sm:block">
            <HeroTrustCard
              icon={Star}
              title="Top Rated"
              description={`${trustCards.topRated.ratingValue} ${trustCards.topRated.ratingLabel} — ${trustCards.topRated.reviewCountLabel}`}
            />
          </div>
          <div className="absolute -right-4 bottom-8 hidden w-64 sm:block">
            <HeroTrustCard icon={Sparkles} title="Handpicked" description={trustCards.handpicked.description} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default HomeHero;
