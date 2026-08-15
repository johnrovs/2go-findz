import { useState } from 'react';
import Button from './Button.jsx';
import ImageUploader from './ImageUploader.jsx';

function CategoryForm({ category, onSubmit, onCancel }) {
  const [name, setName] = useState(category?.productCategoryName ?? '');
  const [commissionRate, setCommissionRate] = useState(
    category?.commissionRate !== undefined ? String(category.commissionRate) : ''
  );
  const [imageFileName, setImageFileName] = useState(category?.imageFileName ?? null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const errors = {};
    if (!name.trim()) errors.productCategoryName = 'Category name is required.';
    const rateValue = Number(commissionRate);
    if (commissionRate === '' || Number.isNaN(rateValue)) {
      errors.commissionRate = 'Commission rate is required.';
    } else if (rateValue < 0 || rateValue > 100) {
      errors.commissionRate = 'Commission rate must be between 0 and 100.';
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
      await onSubmit({ productCategoryName: name.trim(), commissionRate: Number(commissionRate), imageFileName });
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
              <h2 className="text-small font-semibold text-heading">Category Information</h2>
              <p className="text-xs text-muted">Enter the category name and commission rate for your storefront.</p>
            </div>

            <div>
              <div className="mb-1 flex items-center gap-1">
                <label htmlFor="productCategoryName" className="block text-small font-medium text-body">
                  Category Name
                </label>
                <span aria-hidden="true" className="text-danger">
                  *
                </span>
              </div>
              <input
                id="productCategoryName"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={fieldClasses}
                aria-invalid={Boolean(fieldErrors.productCategoryName)}
                aria-describedby={fieldErrors.productCategoryName ? 'productCategoryName-error' : undefined}
              />
              {fieldErrors.productCategoryName && (
                <p id="productCategoryName-error" className="mt-1 text-sm text-danger">
                  {fieldErrors.productCategoryName}
                </p>
              )}
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center gap-1">
                <label htmlFor="commissionRate" className="block text-small font-medium text-body">
                  Commission Rate (%)
                </label>
                <span aria-hidden="true" className="text-danger">
                  *
                </span>
              </div>
              <div className="relative max-w-[200px]">
                <input
                  id="commissionRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={commissionRate}
                  onChange={(event) => setCommissionRate(event.target.value)}
                  className={`${fieldClasses} pr-8`}
                  aria-invalid={Boolean(fieldErrors.commissionRate)}
                  aria-describedby={fieldErrors.commissionRate ? 'commissionRate-error' : undefined}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                >
                  %
                </span>
              </div>
              {fieldErrors.commissionRate && (
                <p id="commissionRate-error" className="mt-1 text-sm text-danger">
                  {fieldErrors.commissionRate}
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <ImageUploader
              imageFileName={imageFileName}
              onChange={setImageFileName}
              label="Category Image"
              variant="dropzone"
            />
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
              {isSubmitting ? 'Saving...' : category ? 'Save Changes' : 'Add Category'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default CategoryForm;
