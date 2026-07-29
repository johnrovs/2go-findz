import { useState } from 'react';
import Button from './Button.jsx';
import BasicInfoTab from './comparison-form/BasicInfoTab.jsx';
import ProductsTab from './comparison-form/ProductsTab.jsx';
import SpecTableTab from './comparison-form/SpecTableTab.jsx';
import SectionsTab from './comparison-form/SectionsTab.jsx';
import FaqTab from './comparison-form/FaqTab.jsx';
import RelatedTab from './comparison-form/RelatedTab.jsx';

const TABS = [
  { key: 'basic', label: 'Basic Info' },
  { key: 'products', label: 'Products' },
  { key: 'spec', label: 'Spec Table' },
  { key: 'sections', label: 'Sections' },
  { key: 'faq', label: 'FAQ' },
  { key: 'related', label: 'Related' },
];

function tabHasError(tabKey, fieldErrors) {
  if (tabKey === 'basic') {
    return Boolean(fieldErrors.title || fieldErrors.description || fieldErrors.categoryId || fieldErrors.slug);
  }
  if (tabKey === 'products') {
    return Boolean(fieldErrors.products) || Object.keys(fieldErrors).some((key) => key.startsWith('product-'));
  }
  if (tabKey === 'related') {
    return Boolean(fieldErrors.relatedComparisons || fieldErrors.relatedProducts);
  }
  return false;
}

function mapProductsFromResponse(comparisonProducts) {
  return (comparisonProducts ?? []).map((cp) => ({
    productId: cp.product.id,
    name: cp.product.name,
    badge: cp.badge ?? '',
    recommendation: cp.recommendation ?? '',
    bestFor: cp.bestFor ?? '',
    mainStrength: cp.mainStrength ?? '',
    mainWeakness: cp.mainWeakness ?? '',
    pros: cp.pros ?? '',
    cons: cp.cons ?? '',
    editorsScore: cp.editorsScore !== null && cp.editorsScore !== undefined ? String(cp.editorsScore) : '',
  }));
}

function mapSpecRowsFromResponse(comparisonSpecRows) {
  return (comparisonSpecRows ?? []).map((row) => ({
    groupLabel: row.groupLabel,
    rowLabel: row.rowLabel,
    values: row.values.map((v) => ({ productId: v.productId, value: v.value, tier: v.tier })),
  }));
}

function mapSectionsFromResponse(comparisonSections) {
  return (comparisonSections ?? []).map((s) => ({ heading: s.heading, body: s.body }));
}

function mapFaqsFromResponse(comparisonFaqs) {
  return (comparisonFaqs ?? []).map((f) => ({ question: f.question, answer: f.answer }));
}

function ComparisonForm({ comparison, categories, onSubmit, onCancel }) {
  const [activeTab, setActiveTab] = useState('basic');
  const [basicInfo, setBasicInfo] = useState({
    title: comparison?.title ?? '',
    slug: comparison?.slug ?? '',
    description: comparison?.description ?? '',
    coverImageFilename: comparison?.coverImageFilename ?? null,
    categoryId: comparison?.categoryId !== undefined ? String(comparison.categoryId) : '',
    seoTitle: comparison?.seoTitle ?? '',
    seoDescription: comparison?.seoDescription ?? '',
    published: comparison?.published ?? true,
  });
  const [products, setProducts] = useState(mapProductsFromResponse(comparison?.products));
  const [specRows, setSpecRows] = useState(mapSpecRowsFromResponse(comparison?.specRows));
  const [sections, setSections] = useState(mapSectionsFromResponse(comparison?.sections));
  const [faqs, setFaqs] = useState(mapFaqsFromResponse(comparison?.faqs));
  const [relatedComparisons, setRelatedComparisons] = useState(comparison?.relatedComparisons ?? []);
  const [relatedProducts, setRelatedProducts] = useState(comparison?.relatedProducts ?? []);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleBasicInfoChange(field, value) {
    setBasicInfo((prev) => ({ ...prev, [field]: value }));
  }

  function handleProductsChange(newProducts) {
    setProducts(newProducts);
    setSpecRows((prevRows) =>
      prevRows.map((row) => {
        const existingByProductId = new Map(row.values.map((v) => [v.productId, v]));
        const nextValues = newProducts.map(
          (p) => existingByProductId.get(p.productId) ?? { productId: p.productId, value: '', tier: 'STANDARD' }
        );
        return { ...row, values: nextValues };
      })
    );
  }

  function validate() {
    const errors = {};
    if (!basicInfo.title.trim()) errors.title = 'Title is required.';
    if (!basicInfo.description.trim()) errors.description = 'Description is required.';
    if (!basicInfo.categoryId) errors.categoryId = 'Category is required.';
    if (basicInfo.slug.trim() && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(basicInfo.slug.trim())) {
      errors.slug = 'Slug must be lowercase letters, numbers, and hyphens only.';
    }
    if (products.length < 2) {
      errors.products = 'A comparison must include at least 2 products.';
    }
    products.forEach((product, index) => {
      const prosBlank = !product.pros.trim();
      const consBlank = !product.cons.trim();
      if (prosBlank !== consBlank) {
        errors[`product-${index}-prosCons`] = 'Pros and cons must both be provided, or both left blank.';
      }
    });
    if (relatedComparisons.length > 8) {
      errors.relatedComparisons = 'You can select at most 8 related comparisons.';
    }
    if (relatedProducts.length > 8) {
      errors.relatedProducts = 'You can select at most 8 related products.';
    }
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstErrorTab = TABS.map((tab) => tab.key).find((tabKey) => tabHasError(tabKey, errors));
      if (firstErrorTab) setActiveTab(firstErrorTab);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: basicInfo.title.trim(),
        slug: basicInfo.slug.trim(),
        description: basicInfo.description.trim(),
        coverImageFilename: basicInfo.coverImageFilename,
        categoryId: Number(basicInfo.categoryId),
        seoTitle: basicInfo.seoTitle.trim() || null,
        seoDescription: basicInfo.seoDescription.trim() || null,
        published: basicInfo.published,
        products: products.map((p) => ({
          productId: p.productId,
          badge: p.badge.trim() || null,
          recommendation: p.recommendation.trim(),
          bestFor: p.bestFor.trim(),
          mainStrength: p.mainStrength.trim(),
          mainWeakness: p.mainWeakness.trim(),
          pros: p.pros.trim() || null,
          cons: p.cons.trim() || null,
          editorsScore: p.editorsScore === '' ? null : Number(p.editorsScore),
        })),
        specRows: specRows.map((row) => ({
          groupLabel: row.groupLabel.trim(),
          rowLabel: row.rowLabel.trim(),
          values: row.values.map((v) => ({ productId: v.productId, value: v.value.trim(), tier: v.tier })),
        })),
        sections: sections.map((s) => ({ heading: s.heading.trim(), body: s.body.trim() })),
        faqs: faqs.map((f) => ({ question: f.question.trim(), answer: f.answer.trim() })),
        relatedComparisonIds: relatedComparisons.map((c) => c.id),
        relatedProductIds: relatedProducts.map((p) => p.id),
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
        <p role="alert" className="mb-4 rounded-btn bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex flex-wrap gap-1" aria-label="Comparison form sections">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-current={activeTab === tab.key ? 'true' : undefined}
              className={`rounded-t-md px-4 py-2 text-sm font-medium ${
                activeTab === tab.key
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted hover:text-body'
              }`}
            >
              {tab.label}
              {tabHasError(tab.key, fieldErrors) && (
                <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-danger" aria-hidden="true" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="mb-6">
        {activeTab === 'basic' && (
          <BasicInfoTab
            values={basicInfo}
            onChange={handleBasicInfoChange}
            categories={categories}
            fieldErrors={fieldErrors}
          />
        )}
        {activeTab === 'products' && (
          <ProductsTab products={products} onChange={handleProductsChange} fieldErrors={fieldErrors} />
        )}
        {activeTab === 'spec' && <SpecTableTab specRows={specRows} onChange={setSpecRows} products={products} />}
        {activeTab === 'sections' && <SectionsTab sections={sections} onChange={setSections} />}
        {activeTab === 'faq' && <FaqTab faqs={faqs} onChange={setFaqs} />}
        {activeTab === 'related' && (
          <RelatedTab
            relatedProducts={relatedProducts}
            onRelatedProductsChange={setRelatedProducts}
            relatedComparisons={relatedComparisons}
            onRelatedComparisonsChange={setRelatedComparisons}
            excludeComparisonId={comparison?.id ?? null}
          />
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : comparison ? 'Save Changes' : 'Add Comparison'}
        </Button>
      </div>
    </form>
  );
}

export default ComparisonForm;
