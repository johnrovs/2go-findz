import { useState } from 'react';
import { Link as LinkIcon, Calendar, Clock } from 'lucide-react';
import Button from './Button.jsx';
import ImageUploader from './ImageUploader.jsx';
import ToggleSwitch from './ToggleSwitch.jsx';

const DESCRIPTION_MAX_LENGTH = 500;

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
  const [sku, setSku] = useState(product?.sku ?? '');
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
        sku: sku.trim() || null,
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

  const fieldClasses =
    'w-full rounded-btn border border-border px-3 py-2.5 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && (
        <p role="alert" className="mb-4 rounded-btn bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
          <div>
            <div className="mb-6">
              <h2 className="text-small font-semibold text-heading">Product Information</h2>
              <p className="text-xs text-muted">Enter the product details and Amazon listing information.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[55%_1fr]">
              <div>
                <div className="mb-1 flex items-center gap-1">
                  <label htmlFor="name" className="block text-small font-medium text-body">
                    Product Name
                  </label>
                  <span aria-hidden="true" className="text-danger">
                    *
                  </span>
                </div>
                <input
                  id="name"
                  type="text"
                  maxLength={200}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={fieldClasses}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                />
                {fieldErrors.name && (
                  <p id="name-error" className="mt-1 text-sm text-danger">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="brand" className="mb-1 block text-small font-medium text-body">
                  Brand
                </label>
                <input
                  id="brand"
                  type="text"
                  maxLength={200}
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  className={fieldClasses}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sku" className="mb-1 block text-small font-medium text-body">
                  SKU
                </label>
                <input
                  id="sku"
                  type="text"
                  maxLength={64}
                  value={sku}
                  onChange={(event) => setSku(event.target.value)}
                  className={fieldClasses}
                />
              </div>

              <div>
                <div className="mb-1 flex items-center gap-1">
                  <label htmlFor="categoryId" className="block text-small font-medium text-body">
                    Category
                  </label>
                  <span aria-hidden="true" className="text-danger">
                    *
                  </span>
                </div>
                <select
                  id="categoryId"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className={`${fieldClasses} bg-white`}
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
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center gap-1">
                <label htmlFor="description" className="block text-small font-medium text-body">
                  Description
                </label>
                <span aria-hidden="true" className="text-danger">
                  *
                </span>
              </div>
              <div className="relative">
                <textarea
                  id="description"
                  rows={4}
                  maxLength={DESCRIPTION_MAX_LENGTH}
                  placeholder="Write a clear, helpful product description..."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className={`${fieldClasses} h-[110px] resize-none pb-6`}
                  aria-invalid={Boolean(fieldErrors.description)}
                  aria-describedby={fieldErrors.description ? 'description-error' : undefined}
                />
                <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-muted">
                  {description.length} / {DESCRIPTION_MAX_LENGTH}
                </span>
              </div>
              {fieldErrors.description && (
                <p id="description-error" className="mt-1 text-sm text-danger">
                  {fieldErrors.description}
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center gap-1">
                  <label htmlFor="productPrice" className="block text-small font-medium text-body">
                    Price ($)
                  </label>
                  <span aria-hidden="true" className="text-danger">
                    *
                  </span>
                </div>
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  >
                    $
                  </span>
                  <input
                    id="productPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={productPrice}
                    onChange={(event) => setProductPrice(event.target.value)}
                    className={`${fieldClasses} pl-7`}
                    aria-invalid={Boolean(fieldErrors.productPrice)}
                    aria-describedby={fieldErrors.productPrice ? 'productPrice-error' : undefined}
                  />
                </div>
                {fieldErrors.productPrice && (
                  <p id="productPrice-error" className="mt-1 text-sm text-danger">
                    {fieldErrors.productPrice}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-1 flex items-center gap-1">
                  <label htmlFor="productLink" className="block text-small font-medium text-body">
                    Amazon Affiliate Link
                  </label>
                  <span aria-hidden="true" className="text-danger">
                    *
                  </span>
                </div>
                <div className="relative">
                  <LinkIcon
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    id="productLink"
                    type="text"
                    placeholder="https://amazon.com/dp/..."
                    value={productLink}
                    onChange={(event) => setProductLink(event.target.value)}
                    className={`${fieldClasses} pl-8`}
                    aria-invalid={Boolean(fieldErrors.productLink)}
                    aria-describedby={fieldErrors.productLink ? 'productLink-error' : undefined}
                  />
                </div>
                {fieldErrors.productLink && (
                  <p id="productLink-error" className="mt-1 text-sm text-danger">
                    {fieldErrors.productLink}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <h2 className="mb-2 text-small font-semibold text-heading">Product Image</h2>
            <ImageUploader imageFileName={imageFileName} onChange={setImageFileName} variant="dropzone" />

            <h2 className="mb-2 mt-6 text-small font-semibold text-heading">Product Visibility</h2>
            <div className="divide-y divide-border rounded-btn border border-border px-4">
              {!isScheduled && (
                <ToggleSwitch
                  label="Active"
                  helperText="Visible on the storefront"
                  checked={active}
                  onChange={setActive}
                />
              )}
              <ToggleSwitch
                label="Trending"
                helperText="Feature in Trending"
                checked={trending}
                onChange={setTrending}
              />
              <ToggleSwitch
                label="Best Seller"
                helperText="Show the Best Seller badge"
                checked={bestSeller}
                onChange={setBestSeller}
              />
            </div>

            <div className="mt-6 rounded-btn border border-border px-4">
              <ToggleSwitch
                label="Schedule for later"
                helperText="Automatically publish this product at a future date and time."
                checked={isScheduled}
                onChange={setIsScheduled}
              />
              {isScheduled && (
                <div className="pb-4">
                  <label
                    htmlFor="scheduledPublishAt"
                    className="mb-1 flex items-center gap-1 text-small font-medium text-body"
                  >
                    <Calendar size={14} />
                    Publish Date &amp; Time
                  </label>
                  <div className="relative">
                    <input
                      id="scheduledPublishAt"
                      type="datetime-local"
                      value={scheduledPublishAt}
                      onChange={(event) => setScheduledPublishAt(event.target.value)}
                      className={`${fieldClasses} pr-9`}
                      aria-invalid={Boolean(fieldErrors.scheduledPublishAt)}
                      aria-describedby={fieldErrors.scheduledPublishAt ? 'scheduledPublishAt-error' : undefined}
                    />
                    <Clock
                      size={14}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                    />
                  </div>
                  {fieldErrors.scheduledPublishAt && (
                    <p id="scheduledPublishAt-error" className="mt-1 text-sm text-danger">
                      {fieldErrors.scheduledPublishAt}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted">
            <span aria-hidden="true" className="text-danger">
              *
            </span>{' '}
            Required fields
          </p>
          <div className="flex w-full gap-3 sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="sm"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default ProductForm;
