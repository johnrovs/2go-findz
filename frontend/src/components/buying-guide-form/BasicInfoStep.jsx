import ImageUploader from '../ImageUploader.jsx';
import IntroductionEditor from './IntroductionEditor.jsx';
import TocBuilder from './TocBuilder.jsx';

function BasicInfoStep({ values, onChange, categories, fieldErrors, tocEntries, onTocEntriesChange, introduction, onIntroductionChange }) {
  const excerptCount = values.excerpt.length;

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
      <h2 className="text-card-title text-heading lg:col-span-2">Basic Information</h2>

      <div>
        <label htmlFor="title" className="mb-1 block text-small font-medium text-body">
          Title
        </label>
        <input
          id="title"
          type="text"
          maxLength={200}
          value={values.title}
          onChange={(event) => onChange('title', event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.title)}
          aria-describedby={fieldErrors.title ? 'title-error' : undefined}
        />
        <p className="mt-1 text-xs text-muted">Use a clear, keyword-rich title.</p>
        {fieldErrors.title && (
          <p id="title-error" className="mt-1 text-sm text-danger">
            {fieldErrors.title}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="slug" className="mb-1 block text-small font-medium text-body">
          Slug
        </label>
        <input
          id="slug"
          type="text"
          maxLength={220}
          value={values.slug}
          onChange={(event) => onChange('slug', event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.slug)}
          aria-describedby={fieldErrors.slug ? 'slug-error' : undefined}
        />
        <p className="mt-1 text-xs text-muted">URL: /buying-guides/{values.slug || '...'}</p>
        {fieldErrors.slug && (
          <p id="slug-error" className="mt-1 text-sm text-danger">
            {fieldErrors.slug}
          </p>
        )}
      </div>

      <div className="lg:col-span-2">
        <label htmlFor="excerpt" className="mb-1 block text-small font-medium text-body">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          rows={3}
          maxLength={250}
          value={values.excerpt}
          onChange={(event) => onChange('excerpt', event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.excerpt)}
          aria-describedby={fieldErrors.excerpt ? 'excerpt-error' : undefined}
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-muted">A short description for search results and social sharing.</p>
          <p className="text-xs text-muted">{excerptCount} / 250</p>
        </div>
        {fieldErrors.excerpt && (
          <p id="excerpt-error" className="mt-1 text-sm text-danger">
            {fieldErrors.excerpt}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="categoryId" className="mb-1 block text-small font-medium text-body">
          Category
        </label>
        <select
          id="categoryId"
          value={values.categoryId}
          onChange={(event) => onChange('categoryId', event.target.value)}
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
        <p className="mt-1 text-xs text-muted">Select the main category.</p>
        {fieldErrors.categoryId && (
          <p id="categoryId-error" className="mt-1 text-sm text-danger">
            {fieldErrors.categoryId}
          </p>
        )}
      </div>

      <div>
        <ImageUploader
          imageFileName={values.coverImageFilename}
          onChange={(value) => onChange('coverImageFilename', value)}
          label="Featured Image"
          variant="wide"
          helperText="Recommended: 1200x630px (16:9), JPG, PNG or WebP. Max 5MB."
        />
      </div>

      <div className="lg:col-span-2">
        <IntroductionEditor value={introduction} onChange={onIntroductionChange} error={fieldErrors.introduction} />
      </div>

      <div className="lg:col-span-2">
        <TocBuilder tocEntries={tocEntries} onChange={onTocEntriesChange} />
      </div>

      <div>
        <label htmlFor="status" className="mb-1 block text-small font-medium text-body">
          Status
        </label>
        <select
          id="status"
          value={values.status}
          onChange={(event) => onChange('status', event.target.value)}
          className="w-full rounded-btn border border-border bg-white px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="Draft">Draft</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Published">Published</option>
        </select>
        <p className="mt-1 text-xs text-muted">Set the current status.</p>
      </div>

      <div>
        <label htmlFor="scheduledPublishAt" className="mb-1 block text-small font-medium text-body">
          Publish Date
        </label>
        <input
          id="scheduledPublishAt"
          type="datetime-local"
          value={values.scheduledPublishAt}
          onChange={(event) => onChange('scheduledPublishAt', event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.scheduledPublishAt)}
          aria-describedby={fieldErrors.scheduledPublishAt ? 'scheduledPublishAt-error' : undefined}
        />
        <p className="mt-1 text-xs text-muted">Set when the guide will be published.</p>
        {fieldErrors.scheduledPublishAt && (
          <p id="scheduledPublishAt-error" className="mt-1 text-sm text-danger">
            {fieldErrors.scheduledPublishAt}
          </p>
        )}
      </div>
    </div>
  );
}

export default BasicInfoStep;
