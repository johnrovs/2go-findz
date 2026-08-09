import { Link } from 'react-router-dom';
import SocialMediaStrip from './home/SocialMediaStrip.jsx';
import NewsletterForm from './NewsletterForm.jsx';
import AffiliateDisclosure from './AffiliateDisclosure.jsx';

const SHOP_LINKS = [
  { to: '/trending', label: 'Trending' },
  { to: '/best-sellers', label: 'Best Sellers' },
  { to: '/products?sort=createdAt,desc', label: 'New Arrivals' },
  { to: '/products', label: 'All Products' },
];

const DISCOVER_LINKS = [
  { to: '/categories', label: 'Categories' },
  { to: '/buying-guides', label: 'Buying Guides' },
  { to: '/compare', label: 'Compare' },
];

const COMPANY_LINKS = [
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact Us' },
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/terms-of-use', label: 'Terms of Use' },
  { to: '/affiliate-disclosure', label: 'Affiliate Disclosure' },
];

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="text-small font-semibold uppercase tracking-wide text-white">{title}</h3>
      <ul className="mt-4 space-y-2">
        {links.map(({ to, label }) => (
          <li key={label}>
            <Link to={to} className="text-small text-white/70 transition hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PublicFooter({ settings }) {
  return (
    <footer className="bg-navy-950 py-16 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <span className="text-card-title text-white">2Go Findz</span>
            <p className="mt-4 max-w-sm text-small text-white/70">
              {settings?.shopBio ??
                'Discover trending Amazon products, everyday essentials, affordable finds, and must-have items carefully selected to help you shop smarter.'}
            </p>
            <div className="mt-6">
              <SocialMediaStrip settings={settings} />
            </div>
          </div>
          <FooterColumn title="Shop" links={SHOP_LINKS} />
          <FooterColumn title="Discover" links={DISCOVER_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <div>
            <NewsletterForm />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p className="text-small text-white/50">&copy; {new Date().getFullYear()} 2Go Findz. All rights reserved.</p>
          {settings?.contactEmail && (
            <a href={`mailto:${settings.contactEmail}`} className="text-small text-white/70 hover:text-white">
              {settings.contactEmail}
            </a>
          )}
        </div>
        <div className="mt-4 text-center sm:text-left">
          <AffiliateDisclosure
            text={settings?.affiliateDisclosure}
            className="text-small leading-relaxed text-white/60"
          />
        </div>
      </div>
    </footer>
  );
}

export default PublicFooter;
