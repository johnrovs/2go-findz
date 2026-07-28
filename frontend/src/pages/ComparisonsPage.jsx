import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { getComparisons } from '../services/comparisonService.js';
import { getSettings } from '../services/settingsService.js';
import { getImageUrl } from '../utils/imageUrl.js';

function ComparisonsPage() {
  const [settings, setSettings] = useState(null);
  const [comparisons, setComparisons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    getComparisons()
      .then(setComparisons)
      .catch((err) => setError(err.message ?? 'Failed to load comparisons.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Comparisons"
            description="Side-by-side breakdowns to help you pick the right product."
          />

          {isLoading && <LoadingSpinner label="Loading comparisons..." />}
          {!isLoading && error && <ErrorState message={error} />}
          {!isLoading && !error && comparisons.length === 0 && (
            <EmptyState title="No comparisons yet" description="Check back soon for curated product comparisons." />
          )}
          {!isLoading && !error && comparisons.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {comparisons.map((comparison) => (
                <Link
                  key={comparison.id}
                  to={`/comparisons/${comparison.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  <div className="aspect-video overflow-hidden bg-slate-100">
                    {getImageUrl(comparison.coverImageFilename) ? (
                      <img
                        src={getImageUrl(comparison.coverImageFilename)}
                        alt={comparison.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                        No image available
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="text-base font-semibold text-slate-900">{comparison.title}</h3>
                    <p className="line-clamp-2 text-sm text-slate-600">{comparison.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer settings={settings} />
    </div>
  );
}

export default ComparisonsPage;
