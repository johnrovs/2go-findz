import { useEffect, useState } from 'react';
import StaticPageLayout from '../components/StaticPageLayout.jsx';
import { getSettings } from '../services/settingsService.js';

function ContactPage() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  return (
    <StaticPageLayout title="Contact Us">
      <p>Have a question about a product, a partnership, or this site? We&apos;d love to hear from you.</p>
      {settings?.contactEmail ? (
        <p>
          Reach us at{' '}
          <a href={`mailto:${settings.contactEmail}`} className="text-primary hover:underline">
            {settings.contactEmail}
          </a>
          .
        </p>
      ) : (
        <p>A contact email hasn&apos;t been configured yet — please check back soon.</p>
      )}
    </StaticPageLayout>
  );
}

export default ContactPage;
