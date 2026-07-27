import { useState } from 'react';
import ImageUploader from './ImageUploader.jsx';
import ProductPicker from './ProductPicker.jsx';

function BuyingGuideForm({ guide, onSubmit, onCancel }) {
  const [coverImageFilename, setCoverImageFilename] = useState(guide?.coverImageFilename ?? null);
  const [title, setTitle] = useState(guide?.title ?? '');
  const [excerpt, setExcerpt] = useState(guide?.excerpt ?? '');
  const [content, setContent] = useState(guide?.content ?? '');
  const [active, setActive] = useState(guide?.active ?? true);
  const [recommendedProducts, setRecommendedProducts] = useState(guide?.recommendedProducts ?? []);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const errors = {};
    if (!title.trim()) errors.title = 'Title is required.';
    if (!excerpt.trim()) errors.excerpt = 'Excerpt is required.';
    if (!content.trim()) errors.content = 'Content is required.';
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
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: content.trim(),
        coverImageFilename,
        active,
        recommendedProductIds: recommendedProducts.map((product) => product.id),
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
    <form onSubmit={handleSubmit} noValidate className="max-w-2xl">
      {formError && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div className="mb-6">
        <ImageUploader imageFileName={coverImageFilename} onChange={setCoverImageFilename} />
      </div>

      <div className="mb-4">
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
          Title
        </label>
        <input
          id="title"
          type="text"
          maxLength={200}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.title)}
          aria-describedby={fieldErrors.title ? 'title-error' : undefined}
        />
        {fieldErrors.title && (
          <p id="title-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.title}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="excerpt" className="mb-1 block text-sm font-medium text-slate-700">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          rows={2}
          maxLength={500}
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.excerpt)}
          aria-describedby={fieldErrors.excerpt ? 'excerpt-error' : undefined}
        />
        {fieldErrors.excerpt && (
          <p id="excerpt-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.excerpt}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="content" className="mb-1 block text-sm font-medium text-slate-700">
          Content
        </label>
        <textarea
          id="content"
          rows={8}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.content)}
          aria-describedby={fieldErrors.content ? 'content-error' : undefined}
        />
        {fieldErrors.content && (
          <p id="content-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.content}
          </p>
        )}
      </div>

      <div className="mb-6">
        <ProductPicker selectedProducts={recommendedProducts} onChange={setRecommendedProducts} />
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
          {isSubmitting ? 'Saving...' : guide ? 'Save Changes' : 'Add Guide'}
        </button>
      </div>
    </form>
  );
}

export default BuyingGuideForm;
