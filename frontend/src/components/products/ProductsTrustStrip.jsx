import { Heart, Scale, Clock, ShieldCheck } from 'lucide-react';

const COLUMNS = [
  {
    Icon: Heart,
    title: 'Curated with Care',
    text: 'Every product is hand-picked by our team, not auto-imported from a bulk catalog.',
  },
  {
    Icon: Scale,
    title: 'Honest & Unbiased',
    text: 'We recommend what works, not what pays more — no pay-to-rank listings.',
  },
  {
    Icon: Clock,
    title: 'Save Time & Money',
    text: 'Skip the endless scrolling and comparison tabs — we did the research for you.',
  },
  {
    Icon: ShieldCheck,
    title: 'Safe & Secure',
    text: 'Every link routes you directly to Amazon’s secure checkout, nothing else.',
  },
];

function ProductsTrustStrip() {
  return (
    <div className="grid grid-cols-1 gap-8 border-t border-border py-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-border">
      {COLUMNS.map(({ Icon, title, text }) => (
        <div key={title} className="flex flex-col items-center gap-3 px-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amazon/10">
            <Icon size={22} className="text-amazon" aria-hidden="true" />
          </span>
          <h3 className="text-sm font-semibold text-heading">{title}</h3>
          <p className="line-clamp-2 text-small text-muted">{text}</p>
        </div>
      ))}
    </div>
  );
}

export default ProductsTrustStrip;
