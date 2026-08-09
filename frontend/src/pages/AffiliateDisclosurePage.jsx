import { useEffect, useState } from 'react';
import StaticPageLayout from '../components/StaticPageLayout.jsx';
import AffiliateDisclosure from '../components/AffiliateDisclosure.jsx';
import { getSettings } from '../services/settingsService.js';

function AffiliateDisclosurePage() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  return (
    <StaticPageLayout title="Affiliate Disclosure">
      <AffiliateDisclosure text={settings?.affiliateDisclosure} className="text-small leading-relaxed text-body" />
    </StaticPageLayout>
  );
}

export default AffiliateDisclosurePage;
