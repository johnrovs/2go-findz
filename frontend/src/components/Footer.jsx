import SocialLinks from './SocialLinks.jsx';
import AffiliateDisclosure from './AffiliateDisclosure.jsx';

function Footer({ settings }) {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center sm:px-6 lg:px-8">
        <span className="text-lg font-bold text-slate-900">2Go Findz</span>
        <SocialLinks settings={settings} />
        <AffiliateDisclosure text={settings?.affiliateDisclosure} />
        {settings?.contactEmail && (
          <a href={`mailto:${settings.contactEmail}`} className="text-sm text-indigo-600 hover:underline">
            {settings.contactEmail}
          </a>
        )}
        <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} 2Go Findz. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
