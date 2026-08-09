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

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && (
        <p role="alert" className="mb-4 rounded-btn bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="mb-4">
        <ImageUploader imageFileName={imageFileName} onChange={setImageFileName} label="Category Image" />
      </div>

      <div className="mb-4">
        <label htmlFor="productCategoryName" className="mb-1 block text-small font-medium text-body">
          Category Name
        </label>
        <input
          id="productCategoryName"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.productCategoryName)}
          aria-describedby={fieldErrors.productCategoryName ? 'productCategoryName-error' : undefined}
        />
        {fieldErrors.productCategoryName && (
          <p id="productCategoryName-error" className="mt-1 text-sm text-danger">
            {fieldErrors.productCategoryName}
          </p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="commissionRate" className="mb-1 block text-small font-medium text-body">
          Commission Rate (%)
        </label>
        <input
          id="commissionRate"
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={commissionRate}
          onChange={(event) => setCommissionRate(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.commissionRate)}
          aria-describedby={fieldErrors.commissionRate ? 'commissionRate-error' : undefined}
        />
        {fieldErrors.commissionRate && (
          <p id="commissionRate-error" className="mt-1 text-sm text-danger">
            {fieldErrors.commissionRate}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : category ? 'Save Changes' : 'Add Category'}
        </Button>
      </div>
    </form>
  );
}

export default CategoryForm;
