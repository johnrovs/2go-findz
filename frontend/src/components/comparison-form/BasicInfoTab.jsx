import ImageUploader from '../ImageUploader.jsx';

function BasicInfoTab({ values, onChange, categories, fieldErrors }) {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <ImageUploader
          imageFileName={values.coverImageFilename}
          onChange={(value) => onChange('coverImageFilename', value)}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
          Title
        </label>
        <input
          id="title"
          type="text"
          maxLength={200}
          value={values.title}
          onChange={(event) => onChange('title', event.target.value)}
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
        <label htmlFor="slug" className="mb-1 block text-sm font-medium text-slate-700">
          URL Slug (optional)
        </label>
        <input
          id="slug"
          type="text"
          maxLength={220}
          value={values.slug}
          onChange={(event) => onChange('slug', event.target.value)}
          placeholder="Leave blank to auto-generate from the title"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.slug)}
          aria-describedby={fieldErrors.slug ? 'slug-error' : undefined}
        />
        {fieldErrors.slug && (
          <p id="slug-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.slug}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          maxLength={500}
          value={values.description}
          onChange={(event) => onChange('description', event.target.value)}
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
        <label htmlFor="categoryId" className="mb-1 block text-sm font-medium text-slate-700">
          Category
        </label>
        <select
          id="categoryId"
          value={values.categoryId}
          onChange={(event) => onChange('categoryId', event.target.value)}
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
        <label htmlFor="seoTitle" className="mb-1 block text-sm font-medium text-slate-700">
          SEO Title (optional)
        </label>
        <input
          id="seoTitle"
          type="text"
          maxLength={200}
          value={values.seoTitle}
          onChange={(event) => onChange('seoTitle', event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="seoDescription" className="mb-1 block text-sm font-medium text-slate-700">
          SEO Description (optional)
        </label>
        <textarea
          id="seoDescription"
          rows={2}
          maxLength={300}
          value={values.seoDescription}
          onChange={(event) => onChange('seoDescription', event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="mb-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={values.published}
            onChange={(event) => onChange('published', event.target.checked)}
          />
          Published
        </label>
      </div>
    </div>
  );
}

export default BasicInfoTab;
