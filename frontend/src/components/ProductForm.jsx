import { useState } from 'react';
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
    <form onSubmit={handleSubmit} noValidate className="max-w-2xl">
      {formError && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div className="mb-6">
        <ImageUploader imageFileName={imageFileName} onChange={setImageFileName} />
      </div>

      <div className="mb-4">
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Product Name
        </label>
        <input
          id="name"
          type="text"
          maxLength={200}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? 'name-error' : undefined}
        />
        {fieldErrors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="categoryId" className="mb-1 block text-sm font-medium text-slate-700">
          Category
        </label>
        <select
          id="categoryId"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          <p id="categoryId-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.categoryId}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={fieldErrors.description ? 'description-error' : undefined}
        />
        {fieldErrors.description && (
          <p id="description-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.description}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="productPrice" className="mb-1 block text-sm font-medium text-slate-700">
          Price ($)
        </label>
        <input
          id="productPrice"
          type="number"
          step="0.01"
          min="0"
          value={productPrice}
          onChange={(event) => setProductPrice(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.productPrice)}
          aria-describedby={fieldErrors.productPrice ? 'productPrice-error' : undefined}
        />
        {fieldErrors.productPrice && (
          <p id="productPrice-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.productPrice}
          </p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="productLink" className="mb-1 block text-sm font-medium text-slate-700">
          Amazon Affiliate Link
        </label>
        <input
          id="productLink"
          type="text"
          value={productLink}
          onChange={(event) => setProductLink(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.productLink)}
          aria-describedby={fieldErrors.productLink ? 'productLink-error' : undefined}
        />
        {fieldErrors.productLink && (
          <p id="productLink-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.productLink}
          </p>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={trending} onChange={(event) => setTrending(event.target.checked)} />
          Trending
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={bestSeller}
            onChange={(event) => setBestSeller(event.target.checked)}
          />
          Best Seller
        </label>
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
          {isSubmitting ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
        </button>
      </div>
    </form>
  );
}

export default ProductForm;
