import { useState } from 'react';
import ImageUploader from './ImageUploader.jsx';

function HeroBannerForm({ banner, onSubmit, onCancel }) {
  const [imageFilename, setImageFilename] = useState(banner?.imageFilename ?? null);
  const [imageAlt, setImageAlt] = useState(banner?.imageAlt ?? '');
  const [badge, setBadge] = useState(banner?.badge ?? '');
  const [headline, setHeadline] = useState(banner?.headline ?? '');
  const [description, setDescription] = useState(banner?.description ?? '');
  const [buttonText, setButtonText] = useState(banner?.buttonText ?? '');
  const [buttonLink, setButtonLink] = useState(banner?.buttonLink ?? '');
  const [displayOrder, setDisplayOrder] = useState(
    banner?.displayOrder !== undefined ? String(banner.displayOrder) : '0'
  );
  const [active, setActive] = useState(banner?.active ?? true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const errors = {};
    if (!imageFilename) errors.imageFilename = 'A slide image is required.';
    if (!imageAlt.trim()) errors.imageAlt = 'Image alt text is required.';
    if (!headline.trim()) errors.headline = 'Headline is required.';
    if (!buttonText.trim()) errors.buttonText = 'Button text is required.';
    if (!buttonLink.trim()) {
      errors.buttonLink = 'Button link is required.';
    } else if (!buttonLink.trim().startsWith('/')) {
      errors.buttonLink = 'Button link must be an internal path starting with /.';
    }
    if (displayOrder === '' || Number.isNaN(Number(displayOrder))) {
      errors.displayOrder = 'Display order is required.';
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
      await onSubmit({
        imageFilename,
        imageAlt: imageAlt.trim(),
        badge: badge.trim() || null,
        headline: headline.trim(),
        description: description.trim() || null,
        buttonText: buttonText.trim(),
        buttonLink: buttonLink.trim(),
        displayOrder: Number(displayOrder),
        active,
      });
    } catch (error) {
      setFieldErrors(error.fieldErrors ?? {});
      if (!error.fieldErrors) {
        setFormError(error.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div className="mb-4">
        <ImageUploader imageFileName={imageFilename} onChange={setImageFilename} />
        {fieldErrors.imageFilename && <p className="mt-1 text-sm text-red-600">{fieldErrors.imageFilename}</p>}
      </div>

      <div className="mb-4">
        <label htmlFor="imageAlt" className="mb-1 block text-sm font-medium text-slate-700">
          Image Alt Text
        </label>
        <input
          id="imageAlt"
          type="text"
          value={imageAlt}
          onChange={(event) => setImageAlt(event.target.value)}
          placeholder="e.g. Curated collection of trending gadgets and home products"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.imageAlt)}
          aria-describedby={fieldErrors.imageAlt ? 'imageAlt-error' : undefined}
        />
        {fieldErrors.imageAlt && (
          <p id="imageAlt-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.imageAlt}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="badge" className="mb-1 block text-sm font-medium text-slate-700">
          Badge (optional)
        </label>
        <input
          id="badge"
          type="text"
          value={badge}
          onChange={(event) => setBadge(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="headline" className="mb-1 block text-sm font-medium text-slate-700">
          Headline
        </label>
        <input
          id="headline"
          type="text"
          value={headline}
          onChange={(event) => setHeadline(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.headline)}
          aria-describedby={fieldErrors.headline ? 'headline-error' : undefined}
        />
        {fieldErrors.headline && (
          <p id="headline-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.headline}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
          Description (optional)
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="buttonText" className="mb-1 block text-sm font-medium text-slate-700">
          Button Text
        </label>
        <input
          id="buttonText"
          type="text"
          value={buttonText}
          onChange={(event) => setButtonText(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.buttonText)}
          aria-describedby={fieldErrors.buttonText ? 'buttonText-error' : undefined}
        />
        {fieldErrors.buttonText && (
          <p id="buttonText-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.buttonText}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="buttonLink" className="mb-1 block text-sm font-medium text-slate-700">
          Button Link
        </label>
        <input
          id="buttonLink"
          type="text"
          value={buttonLink}
          onChange={(event) => setButtonLink(event.target.value)}
          placeholder="e.g. /trending"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.buttonLink)}
          aria-describedby={fieldErrors.buttonLink ? 'buttonLink-error' : undefined}
        />
        {fieldErrors.buttonLink && (
          <p id="buttonLink-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.buttonLink}
          </p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="displayOrder" className="mb-1 block text-sm font-medium text-slate-700">
          Display Order
        </label>
        <input
          id="displayOrder"
          type="number"
          step="1"
          value={displayOrder}
          onChange={(event) => setDisplayOrder(event.target.value)}
          className="w-full max-w-[120px] rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.displayOrder)}
          aria-describedby={fieldErrors.displayOrder ? 'displayOrder-error' : undefined}
        />
        {fieldErrors.displayOrder && (
          <p id="displayOrder-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.displayOrder}
          </p>
        )}
      </div>

      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : banner ? 'Save Changes' : 'Add Slide'}
        </button>
      </div>
    </form>
  );
}

export default HeroBannerForm;
