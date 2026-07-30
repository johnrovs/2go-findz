import { useState } from 'react';
import Button from './Button.jsx';
import ImageUploader from './ImageUploader.jsx';

function ProductForm({ product, categories, onSubmit, onCancel }) {
  const [imageFileName, setImageFileName] = useState(product?.imageFileName ?? null);
  const [name, setName] = useState(product?.name ?? '');
  const [categoryId, setCategoryId] = useState(
    product?.categoryId !== undefined ? String(product.categoryId) : ''
  );
  const [description, setDescription] = useState(product?.description ?? '');
  const [productPrice, setProductPrice] = useState(
    product?.productPrice !== undefined ? String(product.productPrice) : ''
  );
  const [productLink, setProductLink] = useState(product?.productLink ?? '');
  const [trending, setTrending] = useState(product?.trending ?? false);
  const [bestSeller, setBestSeller] = useState(product?.bestSeller ?? false);
  const [active, setActive] = useState(product?.active ?? true);
  const [brand, setBrand] = useState(product?.brand ?? '');
  const [isScheduled, setIsScheduled] = useState(Boolean(product?.scheduledPublishAt));
  const [scheduledPublishAt, setScheduledPublishAt] = useState(
    product?.scheduledPublishAt ? product.scheduledPublishAt.slice(0, 16) : ''
  );
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const errors = {};
    if (!name.trim()) errors.name = 'Product name is required.';
    if (!description.trim()) errors.description = 'Description is required.';
    if (!categoryId) errors.categoryId = 'Category is required.';
    const priceValue = Number(productPrice);
    if (productPrice === '' || Number.isNaN(priceValue)) {
      errors.productPrice = 'Price is required.';
    } else if (priceValue < 0) {
      errors.productPrice = 'Price must be greater than or equal to zero.';
    }
    if (!productLink.trim()) {
      errors.productLink = 'Product URL is required.';
    } else if (!/^https:\/\/.+/.test(productLink.trim())) {
      errors.productLink = 'Product URL must be a valid HTTPS link.';
    }
    if (isScheduled) {
      if (!scheduledPublishAt) {
        errors.scheduledPublishAt = 'Scheduled date is required.';
      } else if (new Date(scheduledPublishAt) <= new Date()) {
        errors.scheduledPublishAt = 'Scheduled date must be in the future.';
      }
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
        name: name.trim(),
        description: description.trim(),
        categoryId: Number(categoryId),
        imageFileName,
        productPrice: Number(productPrice),
        productLink: productLink.trim(),
        trending,
        bestSeller,
        active: isScheduled ? false : active,
        brand: brand.trim() || null,
        // The backend's scheduledPublishAt is a naive LocalDateTime (no timezone), matching
        // every other timestamp in this codebase — sent as-is rather than converted via
        // toISOString(), which would shift it to UTC and desync it from the value the admin
        // actually picked and from the server's own LocalDateTime.now() comparisons.
        scheduledPublishAt: isScheduled ? `${scheduledPublishAt}:00` : null,
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
        <ImageUploader imageFileName={imageFileName} onChange={setImageFileName} />
      </div>

      <div className="mb-4">
        <label htmlFor="name" className="mb-1 block text-small font-medium text-body">
          Product Name
        </label>
        <input
          id="name"
          type="text"
          maxLength={200}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? 'name-error' : undefined}
        />
        {fieldErrors.name && (
          <p id="name-error" className="mt-1 text-sm text-danger">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="brand" className="mb-1 block text-small font-medium text-body">
          Brand
        </label>
        <input
          id="brand"
          type="text"
          maxLength={200}
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="categoryId" className="mb-1 block text-small font-medium text-body">
          Category
        </label>
        <select
          id="categoryId"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="w-full rounded-btn border border-border bg-white px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.categoryId)}
          aria-describedby={fieldErrors.categoryId ? 'categoryId-error' : undefined}
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.productCategoryName}
            </option>
          ))}
        </select>
        {fieldErrors.categoryId && (
          <p id="categoryId-error" className="mt-1 text-sm text-danger">
            {fieldErrors.categoryId}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="description" className="mb-1 block text-small font-medium text-body">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={fieldErrors.description ? 'description-error' : undefined}
        />
        {fieldErrors.description && (
          <p id="description-error" className="mt-1 text-sm text-danger">
            {fieldErrors.description}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="productPrice" className="mb-1 block text-small font-medium text-body">
          Price ($)
        </label>
        <input
          id="productPrice"
          type="number"
          step="0.01"
          min="0"
          value={productPrice}
          onChange={(event) => setProductPrice(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.productPrice)}
          aria-describedby={fieldErrors.productPrice ? 'productPrice-error' : undefined}
        />
        {fieldErrors.productPrice && (
          <p id="productPrice-error" className="mt-1 text-sm text-danger">
            {fieldErrors.productPrice}
          </p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="productLink" className="mb-1 block text-small font-medium text-body">
          Amazon Affiliate Link
        </label>
        <input
          id="productLink"
          type="text"
          value={productLink}
          onChange={(event) => setProductLink(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.productLink)}
          aria-describedby={fieldErrors.productLink ? 'productLink-error' : undefined}
        />
        {fieldErrors.productLink && (
          <p id="productLink-error" className="mt-1 text-sm text-danger">
            {fieldErrors.productLink}
          </p>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-small font-medium text-body">
          <input type="checkbox" checked={trending} onChange={(event) => setTrending(event.target.checked)} />
          Trending
        </label>
        <label className="flex items-center gap-2 text-small font-medium text-body">
          <input
            type="checkbox"
            checked={bestSeller}
            onChange={(event) => setBestSeller(event.target.checked)}
          />
          Best Seller
        </label>
        {!isScheduled && (
          <label className="flex items-center gap-2 text-small font-medium text-body">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
            Active
          </label>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between rounded-btn border border-border p-4">
          <div>
            <p className="text-small font-medium text-body">Schedule for later</p>
            <p className="text-xs text-muted">Automatically publish this product at a future date and time.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isScheduled}
            aria-label="Schedule for later"
            onClick={() => setIsScheduled((current) => !current)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              isScheduled ? 'bg-primary' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isScheduled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {isScheduled && (
          <div className="mt-4">
            <label htmlFor="scheduledPublishAt" className="mb-1 block text-small font-medium text-body">
              Publish Date &amp; Time
            </label>
            <input
              id="scheduledPublishAt"
              type="datetime-local"
              value={scheduledPublishAt}
              onChange={(event) => setScheduledPublishAt(event.target.value)}
              className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              aria-invalid={Boolean(fieldErrors.scheduledPublishAt)}
              aria-describedby={fieldErrors.scheduledPublishAt ? 'scheduledPublishAt-error' : undefined}
            />
            {fieldErrors.scheduledPublishAt && (
              <p id="scheduledPublishAt-error" className="mt-1 text-sm text-danger">
                {fieldErrors.scheduledPublishAt}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
        </Button>
      </div>
    </form>
  );
}

export default ProductForm;
