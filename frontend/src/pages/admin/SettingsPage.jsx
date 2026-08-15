import { useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import ImageUploader from '../../components/ImageUploader.jsx';
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
  facebookUrl: '',
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
    facebookUrl: data.facebookUrl ?? '',
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

  const fieldClasses =
    'w-full rounded-btn border border-border px-3 py-2.5 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div>
      <h1 className="text-page-heading text-heading">System Settings</h1>
      <p className="mb-6 mt-1 text-small text-muted">
        Manage your storefront&apos;s branding, content, and contact information.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-10">
        {formError && (
          <p role="alert" className="rounded-btn bg-danger/10 px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}

        <section className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-card-title text-heading">Branding &amp; Hero Images</h2>
          <div className="space-y-6">
            <div>
              <ImageUploader
                imageFileName={settings.logoImageFilename}
                onChange={(filename) => handleChange('logoImageFilename', filename)}
                label="Logo"
                variant="dropzone"
              />
            </div>
            <div>
              <ImageUploader
                imageFileName={settings.heroImageFilename}
                onChange={(filename) => handleChange('heroImageFilename', filename)}
                label="Hero Image"
                variant="dropzone"
              />
            </div>
            <div>
              <ImageUploader
                imageFileName={settings.placeholderImageFilename}
                onChange={(filename) => handleChange('placeholderImageFilename', filename)}
                label="Product Placeholder Image"
                variant="dropzone"
              />
            </div>
          </div>
        </section>

        <section className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-card-title text-heading">Hero Content</h2>
          <div className="mb-4">
            <label htmlFor="heroHeadline" className="mb-1 block text-small font-medium text-body">
              Hero Headline
            </label>
            <input
              id="heroHeadline"
              type="text"
              value={settings.heroHeadline}
              onChange={(event) => handleChange('heroHeadline', event.target.value)}
              className={fieldClasses}
            />
          </div>
          <div>
            <label htmlFor="heroDescription" className="mb-1 block text-small font-medium text-body">
              Hero Description
            </label>
            <textarea
              id="heroDescription"
              rows={3}
              value={settings.heroDescription}
              onChange={(event) => handleChange('heroDescription', event.target.value)}
              className={fieldClasses}
            />
          </div>
        </section>

        <section className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-card-title text-heading">Social Links</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tiktokUrl" className="mb-1 block text-small font-medium text-body">
                TikTok URL
              </label>
              <input
                id="tiktokUrl"
                type="text"
                value={settings.tiktokUrl}
                onChange={(event) => handleChange('tiktokUrl', event.target.value)}
                className={fieldClasses}
              />
            </div>
            <div>
              <label htmlFor="pinterestUrl" className="mb-1 block text-small font-medium text-body">
                Pinterest URL
              </label>
              <input
                id="pinterestUrl"
                type="text"
                value={settings.pinterestUrl}
                onChange={(event) => handleChange('pinterestUrl', event.target.value)}
                className={fieldClasses}
              />
            </div>
            <div>
              <label htmlFor="instagramUrl" className="mb-1 block text-small font-medium text-body">
                Instagram URL
              </label>
              <input
                id="instagramUrl"
                type="text"
                value={settings.instagramUrl}
                onChange={(event) => handleChange('instagramUrl', event.target.value)}
                className={fieldClasses}
              />
            </div>
            <div>
              <label htmlFor="youtubeUrl" className="mb-1 block text-small font-medium text-body">
                YouTube URL
              </label>
              <input
                id="youtubeUrl"
                type="text"
                value={settings.youtubeUrl}
                onChange={(event) => handleChange('youtubeUrl', event.target.value)}
                className={fieldClasses}
              />
            </div>
            <div>
              <label htmlFor="facebookUrl" className="mb-1 block text-small font-medium text-body">
                Facebook URL
              </label>
              <input
                id="facebookUrl"
                type="text"
                value={settings.facebookUrl}
                onChange={(event) => handleChange('facebookUrl', event.target.value)}
                className={fieldClasses}
              />
            </div>
          </div>
        </section>

        <section className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-card-title text-heading">Shop Info &amp; Disclosure</h2>
          <div className="mb-4">
            <label htmlFor="shopBio" className="mb-1 block text-small font-medium text-body">
              Shop Bio
            </label>
            <textarea
              id="shopBio"
              rows={3}
              value={settings.shopBio}
              onChange={(event) => handleChange('shopBio', event.target.value)}
              className={fieldClasses}
            />
          </div>
          <div className="mb-4">
            <div className="mb-1 flex items-center gap-1">
              <label htmlFor="affiliateDisclosure" className="block text-small font-medium text-body">
                Affiliate Disclosure
              </label>
              <span aria-hidden="true" className="text-danger">
                *
              </span>
            </div>
            <textarea
              id="affiliateDisclosure"
              rows={3}
              value={settings.affiliateDisclosure}
              onChange={(event) => handleChange('affiliateDisclosure', event.target.value)}
              className={fieldClasses}
              aria-invalid={Boolean(fieldErrors.affiliateDisclosure)}
              aria-describedby={fieldErrors.affiliateDisclosure ? 'affiliateDisclosure-error' : undefined}
            />
            {fieldErrors.affiliateDisclosure && (
              <p id="affiliateDisclosure-error" className="mt-1 text-sm text-danger">
                {fieldErrors.affiliateDisclosure}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="contactEmail" className="mb-1 block text-small font-medium text-body">
              Contact Email
            </label>
            <input
              id="contactEmail"
              type="text"
              value={settings.contactEmail}
              onChange={(event) => handleChange('contactEmail', event.target.value)}
              className={fieldClasses}
              aria-invalid={Boolean(fieldErrors.contactEmail)}
              aria-describedby={fieldErrors.contactEmail ? 'contactEmail-error' : undefined}
            />
            {fieldErrors.contactEmail && (
              <p id="contactEmail-error" className="mt-1 text-sm text-danger">
                {fieldErrors.contactEmail}
              </p>
            )}
          </div>
        </section>

        <Button type="submit" variant="accent" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
}

export default SettingsPage;
