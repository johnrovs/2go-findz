import { Sparkles } from 'lucide-react';
import Button from '../Button.jsx';
import { HOME_HERO_CONTENT, HOME_HERO_IMAGE } from '../../config/homeContent.js';

function HomeHero({ headline, description }) {
  const { badge } = HOME_HERO_CONTENT;

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
        </div>

        <img
          src={HOME_HERO_IMAGE}
          alt=""
          loading="eager"
          width={1817}
          height={866}
          className="aspect-[1817/866] w-full rounded-card object-cover shadow-card-hover"
        />
      </div>
    </section>
  );
}

export default HomeHero;
