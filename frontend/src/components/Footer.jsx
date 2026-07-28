import SocialLinks from './SocialLinks.jsx';
import AffiliateDisclosure from './AffiliateDisclosure.jsx';

function Footer({ settings }) {
  return (
    <footer className="border-t border-border bg-surface-secondary py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center sm:px-6 lg:px-8">
        <span className="text-lg font-bold text-heading">2Go Findz</span>
        <SocialLinks settings={settings} />
        <AffiliateDisclosure text={settings?.affiliateDisclosure} />
        {settings?.contactEmail && (
          <a href={`mailto:${settings.contactEmail}`} className="text-sm text-primary hover:underline">
            {settings.contactEmail}
          </a>
        )}
        {/* TODO: Enable newsletter functionality in a future deployment. */}
        {/* <NewsletterSignup /> */}
        <p className="text-xs text-muted">&copy; {new Date().getFullYear()} 2Go Findz. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
