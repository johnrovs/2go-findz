import { useEffect, useState } from 'react';
import Navbar from './Navbar.jsx';
import PublicFooter from './PublicFooter.jsx';
import { getSettings } from '../services/settingsService.js';

function StaticPageLayout({ title, children }) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-page-heading text-heading">{title}</h1>
        <div className="mt-8 space-y-4 text-body">{children}</div>
      </main>
      <PublicFooter settings={settings} />
    </div>
  );
}

export default StaticPageLayout;
