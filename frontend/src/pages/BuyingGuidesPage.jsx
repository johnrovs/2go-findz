import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar.jsx';
import PublicFooter from '../components/PublicFooter.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { getBuyingGuides } from '../services/buyingGuideService.js';
import { getSettings } from '../services/settingsService.js';
import { getImageUrl } from '../utils/imageUrl.js';

function BuyingGuidesPage() {
  const { t } = useTranslation(['guides', 'common']);
  const [settings, setSettings] = useState(null);
  const [guides, setGuides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    getBuyingGuides()
      .then(setGuides)
      .catch((err) => setError(err.message ?? t('listing.loadError')))
      .finally(() => setIsLoading(false));
  }, [t]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title={t('common:nav.buyingGuides')} description={t('listing.description')} />

          {isLoading && <LoadingSpinner label={t('listing.loading')} />}
          {!isLoading && error && <ErrorState message={error} />}
          {!isLoading && !error && guides.length === 0 && (
            <EmptyState title={t('listing.emptyTitle')} description={t('listing.emptyDescription')} />
          )}
          {!isLoading && !error && guides.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((guide) => (
                <Link
                  key={guide.id}
                  to={`/buying-guides/${guide.slug}`}
                  className="group flex flex-col overflow-hidden rounded-card border border-slate-200 bg-white shadow-card transition-shadow duration-200 hover:shadow-card-hover"
                >
                  <div className="aspect-video overflow-hidden bg-slate-100">
                    {getImageUrl(guide.coverImageFilename) ? (
                      <img
                        src={getImageUrl(guide.coverImageFilename)}
                        alt={guide.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                        {t('listing.noImageAvailable')}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="text-card-title text-heading">{guide.title}</h3>
                    <p className="line-clamp-2 text-small text-body">{guide.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <PublicFooter settings={settings} />
    </div>
  );
}

export default BuyingGuidesPage;
