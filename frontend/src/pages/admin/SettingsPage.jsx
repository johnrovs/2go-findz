import { useEffect, useState } from 'react';
import ImageUploader from '../../components/ImageUploader.jsx';
import HeroBannerManager from '../../components/HeroBannerManager.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { useToast } from '../../hooks/useToast.js';
import { getSettings, updateSettings } from '../../services/adminSettingsService.js';

const INITIAL_SETTINGS = {
  logoImageFilename: null,
  heroImageFilename: null,
  placeholderImageFilename: null,
  tiktokUrl: '',
  pinterestUrl: '',
  instagramUrl: '',
  youtubeUrl: '',
  shopBio: '',
  heroHeadline: '',
  heroDescription: '',
  affiliateDisclosure: '',
  contactEmail: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeSettings(data) {
  return {
    logoImageFilename: data.logoImageFilename ?? null,
    heroImageFilename: data.heroImageFilename ?? null,
    placeholderImageFilename: data.placeholderImageFilename ?? null,
    tiktokUrl: data.tiktokUrl ?? '',
    pinterestUrl: data.pinterestUrl ?? '',
    instagramUrl: data.instagramUrl ?? '',
    youtubeUrl: data.youtubeUrl ?? '',
    shopBio: data.shopBio ?? '',
    heroHeadline: data.heroHeadline ?? '',
    heroDescription: data.heroDescription ?? '',
    affiliateDisclosure: data.affiliateDisclosure ?? '',
    contactEmail: data.contactEmail ?? '',
  };
}

function SettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function load() {
    setIsLoading(true);
    setLoadError(null);
    getSettings()
      .then((data) => setSettings(normalizeSettings(data)))
      .catch((err) => setLoadError(err.message ?? 'Failed to load settings.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    // load() resets loading/error state synchronously before fetching; this is the
    // standard reset-before-async-work pattern and can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function handleChange(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function validate() {
    const errors = {};
    if (!settings.affiliateDisclosure.trim()) {
      errors.affiliateDisclosure = 'Affiliate disclosure is required.';
    }
    if (settings.contactEmail.trim() && !EMAIL_PATTERN.test(settings.contactEmail.trim())) {
      errors.contactEmail = 'Contact email must be a valid email address.';
    }
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const updated = await updateSettings(settings);
      setSettings(normalizeSettings(updated));
      showToast('Settings updated successfully.');
    } catch (error) {
      setFieldErrors(error.fieldErrors ?? {});
      if (!error.fieldErrors) {
        setFormError(error.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingSpinner label="Loading settings..." />;
  }

  if (loadError) {
    return <ErrorState message={loadError} onRetry={load} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">System Settings</h1>

      <form onSubmit={handleSubmit} noValidate className="max-w-2xl space-y-10">
        {formError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}

        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Branding &amp; Hero Images</h2>
          <div className="space-y-6">
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Logo</span>
              <ImageUploader
                imageFileName={settings.logoImageFilename}
                onChange={(filename) => handleChange('logoImageFilename', filename)}
              />
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Hero Image</span>
              <ImageUploader
                imageFileName={settings.heroImageFilename}
                onChange={(filename) => handleChange('heroImageFilename', filename)}
              />
              <p className="mt-1 text-sm text-slate-500">
                This image is used only when no hero banner slides are configured below.
              </p>
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Product Placeholder Image</span>
              <ImageUploader
                imageFileName={settings.placeholderImageFilename}
                onChange={(filename) => handleChange('placeholderImageFilename', filename)}
              />
            </div>
          </div>
        </section>

        <section>
          <HeroBannerManager />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Hero Content</h2>
          <div className="mb-4">
            <label htmlFor="heroHeadline" className="mb-1 block text-sm font-medium text-slate-700">
              Hero Headline
            </label>
            <input
              id="heroHeadline"
              type="text"
              value={settings.heroHeadline}
              onChange={(event) => handleChange('heroHeadline', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="heroDescription" className="mb-1 block text-sm font-medium text-slate-700">
              Hero Description
            </label>
            <textarea
              id="heroDescription"
              rows={3}
              value={settings.heroDescription}
              onChange={(event) => handleChange('heroDescription', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Social Links</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tiktokUrl" className="mb-1 block text-sm font-medium text-slate-700">
                TikTok URL
              </label>
              <input
                id="tiktokUrl"
                type="text"
                value={settings.tiktokUrl}
                onChange={(event) => handleChange('tiktokUrl', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="pinterestUrl" className="mb-1 block text-sm font-medium text-slate-700">
                Pinterest URL
              </label>
              <input
                id="pinterestUrl"
                type="text"
                value={settings.pinterestUrl}
                onChange={(event) => handleChange('pinterestUrl', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="instagramUrl" className="mb-1 block text-sm font-medium text-slate-700">
                Instagram URL
              </label>
              <input
                id="instagramUrl"
                type="text"
                value={settings.instagramUrl}
                onChange={(event) => handleChange('instagramUrl', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="youtubeUrl" className="mb-1 block text-sm font-medium text-slate-700">
                YouTube URL
              </label>
              <input
                id="youtubeUrl"
                type="text"
                value={settings.youtubeUrl}
                onChange={(event) => handleChange('youtubeUrl', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Shop Info &amp; Disclosure</h2>
          <div className="mb-4">
            <label htmlFor="shopBio" className="mb-1 block text-sm font-medium text-slate-700">
              Shop Bio
            </label>
            <textarea
              id="shopBio"
              rows={3}
              value={settings.shopBio}
              onChange={(event) => handleChange('shopBio', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="affiliateDisclosure" className="mb-1 block text-sm font-medium text-slate-700">
              Affiliate Disclosure
            </label>
            <textarea
              id="affiliateDisclosure"
              rows={3}
              value={settings.affiliateDisclosure}
              onChange={(event) => handleChange('affiliateDisclosure', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-invalid={Boolean(fieldErrors.affiliateDisclosure)}
              aria-describedby={fieldErrors.affiliateDisclosure ? 'affiliateDisclosure-error' : undefined}
            />
            {fieldErrors.affiliateDisclosure && (
              <p id="affiliateDisclosure-error" className="mt-1 text-sm text-red-600">
                {fieldErrors.affiliateDisclosure}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="contactEmail" className="mb-1 block text-sm font-medium text-slate-700">
              Contact Email
            </label>
            <input
              id="contactEmail"
              type="text"
              value={settings.contactEmail}
              onChange={(event) => handleChange('contactEmail', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-invalid={Boolean(fieldErrors.contactEmail)}
              aria-describedby={fieldErrors.contactEmail ? 'contactEmail-error' : undefined}
            />
            {fieldErrors.contactEmail && (
              <p id="contactEmail-error" className="mt-1 text-sm text-red-600">
                {fieldErrors.contactEmail}
              </p>
            )}
          </div>
        </section>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

export default SettingsPage;
