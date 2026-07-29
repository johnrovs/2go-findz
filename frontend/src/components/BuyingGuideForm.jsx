import { useState } from 'react';
import Button from './Button.jsx';
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
        <p role="alert" className="mb-4 rounded-btn bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="mb-6">
        <ImageUploader imageFileName={coverImageFilename} onChange={setCoverImageFilename} />
      </div>

      <div className="mb-4">
        <label htmlFor="title" className="mb-1 block text-small font-medium text-body">
          Title
        </label>
        <input
          id="title"
          type="text"
          maxLength={200}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.title)}
          aria-describedby={fieldErrors.title ? 'title-error' : undefined}
        />
        {fieldErrors.title && (
          <p id="title-error" className="mt-1 text-sm text-danger">
            {fieldErrors.title}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="excerpt" className="mb-1 block text-small font-medium text-body">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          rows={2}
          maxLength={500}
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.excerpt)}
          aria-describedby={fieldErrors.excerpt ? 'excerpt-error' : undefined}
        />
        {fieldErrors.excerpt && (
          <p id="excerpt-error" className="mt-1 text-sm text-danger">
            {fieldErrors.excerpt}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="content" className="mb-1 block text-small font-medium text-body">
          Content
        </label>
        <textarea
          id="content"
          rows={8}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.content)}
          aria-describedby={fieldErrors.content ? 'content-error' : undefined}
        />
        {fieldErrors.content && (
          <p id="content-error" className="mt-1 text-sm text-danger">
            {fieldErrors.content}
          </p>
        )}
      </div>

      <div className="mb-6">
        <ProductPicker selectedProducts={recommendedProducts} onChange={setRecommendedProducts} />
      </div>

      <div className="mb-6">
        <label className="flex items-center gap-2 text-small font-medium text-body">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : guide ? 'Save Changes' : 'Add Guide'}
        </Button>
      </div>
    </form>
  );
}

export default BuyingGuideForm;
