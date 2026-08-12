import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AffiliateDisclosure from './AffiliateDisclosure.jsx';

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="text-small font-semibold uppercase tracking-wide text-white">{title}</h3>
      <ul className="mt-4 space-y-2">
        {links.map(({ to, label }) => (
          <li key={to}>
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
  const { t } = useTranslation('common');

  const shopLinks = [
    { to: '/trending', label: t('nav.trending') },
    { to: '/best-sellers', label: t('nav.bestSellers') },
    { to: '/products?sort=createdAt,desc', label: t('nav.newArrivals') },
    { to: '/products', label: t('nav.allProducts') },
  ];

  const discoverLinks = [
    { to: '/categories', label: t('nav.categories') },
    { to: '/buying-guides', label: t('nav.buyingGuides') },
  ];

  const companyLinks = [
    { to: '/about', label: t('nav.aboutUs') },
    { to: '/contact', label: t('nav.contactUs') },
    { to: '/privacy-policy', label: t('nav.privacyPolicy') },
    { to: '/terms-of-use', label: t('nav.termsOfUse') },
    { to: '/affiliate-disclosure', label: t('nav.affiliateDisclosure') },
  ];

  return (
    <footer className="bg-navy-950 py-16 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <span className="text-card-title text-white">2Go Findz</span>
            <p className="mt-4 max-w-sm text-small text-white/70">
              {settings?.shopBio ?? t('footer.defaultBio')}
            </p>
          </div>
          <FooterColumn title={t('footer.shopHeading')} links={shopLinks} />
          <FooterColumn title={t('footer.discoverHeading')} links={discoverLinks} />
          <FooterColumn title={t('footer.companyHeading')} links={companyLinks} />
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p className="text-small text-white/50">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
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
