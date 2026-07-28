import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { getBuyingGuideById } from '../services/buyingGuideService.js';
import { getSettings } from '../services/settingsService.js';
import { getImageUrl } from '../utils/imageUrl.js';

function BuyingGuideDetailPage() {
  const { id } = useParams();
  const [settings, setSettings] = useState(null);
  const [guide, setGuide] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    // Resetting loading/error state at the start of each fetch is the standard
    // reset-before-async-work pattern; it can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    getBuyingGuideById(id)
      .then(setGuide)
      .catch((err) => setError(err.message ?? 'Buying guide not found.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="py-24">
        <div className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8">
          {isLoading && <LoadingSpinner label="Loading buying guide..." />}
          {!isLoading && error && <ErrorState message={error} />}
          {!isLoading && !error && guide && (
            <>
              {getImageUrl(guide.coverImageFilename) && (
                <img
                  src={getImageUrl(guide.coverImageFilename)}
                  alt={guide.title}
                  className="mb-6 aspect-video w-full rounded-image object-cover"
                />
              )}
              <h1 className="mb-4 text-page-heading text-heading">{guide.title}</h1>
              <p className="whitespace-pre-line text-body">{guide.content}</p>
            </>
          )}
        </div>

        {!isLoading && !error && guide && guide.recommendedProducts.length > 0 && (
          <div className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Recommended Products" />
            <ProductGrid products={guide.recommendedProducts} isLoading={false} error={null} />
          </div>
        )}
      </section>
      <Footer settings={settings} />
    </div>
  );
}

export default BuyingGuideDetailPage;
