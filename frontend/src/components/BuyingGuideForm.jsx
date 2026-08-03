import { useEffect, useState } from 'react';
import EditorHeader from './buying-guide-form/EditorHeader.jsx';
import Stepper from './buying-guide-form/Stepper.jsx';
import BasicInfoStep from './buying-guide-form/BasicInfoStep.jsx';
import ProductsStep from './buying-guide-form/ProductsStep.jsx';
import BuyingGuideQuickPicksStep from './buying-guide-form/BuyingGuideQuickPicksStep.jsx';
import BuyingGuideComparisonStep from './buying-guide-form/BuyingGuideComparisonStep.jsx';
import LivePreview from './buying-guide-form/LivePreview.jsx';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import { getSettings } from '../services/settingsService.js';

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deriveStatus(guide) {
  if (!guide) return 'Draft';
  if (guide.active) return 'Published';
  if (guide.scheduledPublishAt) return 'Scheduled';
  return 'Draft';
}

function mapComparisonSpecsFromResponse(comparisonSpecs) {
  return (comparisonSpecs ?? []).map((spec) => ({
    clientId: crypto.randomUUID(),
    specificationName: spec.specificationName,
    values: spec.values.map((v) => ({ productId: v.product.id, value: v.specificationValue })),
  }));
}

function mapRecommendationSectionsFromResponse(recommendationSections) {
  return (recommendationSections ?? []).map((section) => ({
    productId: section.product.id,
    recommendationType: section.recommendationType,
    sectionLabel: section.sectionLabel,
    whyRecommended: section.whyRecommended,
    pros: section.pros.map((item) => ({ content: item.content })),
    cons: section.cons.map((item) => ({ content: item.content })),
    bestFor: section.bestFor.map((item) => ({ content: item.content })),
  }));
}

function mapFaqsFromResponse(faqs) {
  return (faqs ?? []).map((faq) => ({ question: faq.question, answer: faq.answer }));
}

function mapTocEntriesFromResponse(tocEntries) {
  return (tocEntries ?? []).map((entry) => ({
    clientId: entry.sectionKey ?? `custom-${entry.id}`,
    sectionKey: entry.sectionKey,
    title: entry.title ?? '',
    content: entry.content ?? '',
    visible: entry.visible,
  }));
}

const DEFAULT_TOC_ENTRIES = ['QUICK_RECOMMENDATIONS', 'COMPARISON_TABLE', 'TOP_PICK', 'RUNNER_UPS', 'FAQS'].map((sectionKey) => ({
  clientId: sectionKey,
  sectionKey,
  title: '',
  content: '',
  visible: true,
}));

function BuyingGuideForm({ guide, categories, onSubmit, onCancel, onMenuClick }) {
  const [basicInfo, setBasicInfo] = useState({
    title: guide?.title ?? '',
    slug: guide?.slug ?? '',
    excerpt: guide?.excerpt ?? '',
    coverImageFilename: guide?.coverImageFilename ?? null,
    categoryId: guide?.categoryId !== undefined ? String(guide.categoryId) : '',
    status: deriveStatus(guide),
    scheduledPublishAt: guide?.scheduledPublishAt ? guide.scheduledPublishAt.slice(0, 16) : '',
    isSlugDirty: Boolean(guide),
  });
  const [introduction, setIntroduction] = useState(guide?.introduction ?? '');
  const [tocEntries, setTocEntries] = useState(guide ? mapTocEntriesFromResponse(guide.tocEntries) : DEFAULT_TOC_ENTRIES);
  const [recommendedProducts, setRecommendedProducts] = useState(guide?.recommendedProducts ?? []);
  const [activeStep, setActiveStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);
  const [quickRecommendations, setQuickRecommendations] = useState(
    (guide?.quickRecommendations ?? []).map((r) => ({ product: r.product, badgeName: r.badgeName }))
  );
  const [quickPicksErrors, setQuickPicksErrors] = useState({});
  const [comparisonSpecs, setComparisonSpecs] = useState(mapComparisonSpecsFromResponse(guide?.comparisonSpecs));
  const [comparisonErrors, setComparisonErrors] = useState({});
  const [recommendationSections] = useState(mapRecommendationSectionsFromResponse(guide?.recommendationSections));
  const [faqs] = useState(mapFaqsFromResponse(guide?.faqs));
  const [seoTitle] = useState(guide?.seoTitle ?? null);
  const [seoDescription] = useState(guide?.seoDescription ?? null);
  const [settings, setSettings] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  // Adjusting state during render (React's documented alternative to a sync-only Effect):
  // reconcile each spec's per-product values against the current product list the moment
  // recommendedProducts' membership changes, rather than after an extra render+effect pass.
  const recommendedProductIdsKey = recommendedProducts.map((product) => product.id).join(',');
  const [syncedProductIdsKey, setSyncedProductIdsKey] = useState(recommendedProductIdsKey);
  if (recommendedProductIdsKey !== syncedProductIdsKey) {
    setSyncedProductIdsKey(recommendedProductIdsKey);
    setComparisonSpecs((prev) =>
      prev.map((spec) => {
        const existingByProductId = new Map(spec.values.map((v) => [v.productId, v.value]));
        return {
          ...spec,
          values: recommendedProducts.map((product) => ({
            productId: product.id,
            value: existingByProductId.get(product.id) ?? '',
          })),
        };
      })
    );
  }

  function handleBasicInfoChange(field, value) {
    setBasicInfo((prev) => {
      if (field === 'title') {
        const next = { ...prev, title: value };
        if (!prev.isSlugDirty) next.slug = slugify(value);
        return next;
      }
      if (field === 'slug') {
        return { ...prev, slug: value, isSlugDirty: true };
      }
      return { ...prev, [field]: value };
    });
  }

  function validate() {
    const errors = {};
    if (!basicInfo.title.trim()) errors.title = 'Title is required.';
    if (!basicInfo.slug.trim()) {
      errors.slug = 'Slug is required.';
    } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(basicInfo.slug.trim())) {
      errors.slug = 'Slug must be lowercase letters, numbers, and hyphens only.';
    }
    if (!basicInfo.excerpt.trim()) errors.excerpt = 'Excerpt is required.';
    if (!basicInfo.categoryId) errors.categoryId = 'Category is required.';
    if (!introduction.replace(/<[^>]*>/g, '').trim()) errors.introduction = 'Introduction is required.';
    if (basicInfo.status === 'Scheduled') {
      if (!basicInfo.scheduledPublishAt) {
        errors.scheduledPublishAt = 'Publish date is required.';
      } else if (new Date(basicInfo.scheduledPublishAt) <= new Date()) {
        errors.scheduledPublishAt = 'Publish date must be in the future.';
      }
    }
    tocEntries
      .filter((entry) => !entry.sectionKey)
      .forEach((entry, index) => {
        if (!entry.title.trim() || !entry.content.trim()) {
          errors[`tocEntry-${index}`] = 'Every custom section needs a title and content.';
        }
      });
    return errors;
  }

  function buildPayload(forcePublish) {
    const { active, scheduledPublishAt } = forcePublish
      ? { active: true, scheduledPublishAt: null }
      : basicInfo.status === 'Published'
        ? { active: true, scheduledPublishAt: null }
        : basicInfo.status === 'Scheduled'
          ? { active: false, scheduledPublishAt: `${basicInfo.scheduledPublishAt}:00` }
          : { active: false, scheduledPublishAt: null };

    return {
      title: basicInfo.title.trim(),
      slug: basicInfo.slug.trim(),
      excerpt: basicInfo.excerpt.trim(),
      introduction,
      coverImageFilename: basicInfo.coverImageFilename,
      categoryId: Number(basicInfo.categoryId),
      seoTitle,
      seoDescription,
      active,
      scheduledPublishAt,
      recommendedProductIds: recommendedProducts.map((product) => product.id),
      quickRecommendations: quickRecommendations.map(({ product, badgeName }) => ({
        productId: product.id,
        badgeName: badgeName.trim(),
      })),
      comparisonSpecs: comparisonSpecs.map(({ specificationName, values }) => ({
        specificationName: specificationName.trim(),
        values: values.map(({ productId, value }) => ({ productId, value: value.trim() })),
      })),
      recommendationSections,
      faqs,
      tocEntries: tocEntries.map(({ sectionKey, title, content, visible }) => ({
        sectionKey,
        // The backend rejects a structural entry (sectionKey set) that carries a
        // non-null title/content -- '' is a non-null string, so the empty-string
        // default used for controlled inputs must convert back to null here.
        title: sectionKey ? null : title,
        content: sectionKey ? null : content,
        visible,
      })),
    };
  }

  function handleNext() {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setMaxUnlockedStep((prev) => Math.max(prev, 2));
    setActiveStep(2);
  }

  function handleProductsNext() {
    setMaxUnlockedStep((prev) => Math.max(prev, 3));
    setActiveStep(3);
  }

  function validateQuickPicks() {
    const errors = {};
    if (quickRecommendations.length === 0) {
      errors.quickPicksCount = 'Add at least one quick pick before continuing.';
      return errors;
    }
    const seenBadgeNames = new Set();
    quickRecommendations.forEach(({ product, badgeName }) => {
      const trimmed = badgeName.trim();
      if (!trimmed) {
        errors[product.id] = 'Badge name is required.';
        return;
      }
      const key = trimmed.toLowerCase();
      if (seenBadgeNames.has(key)) {
        errors[product.id] = 'Two quick picks cannot use the same badge name.';
        return;
      }
      seenBadgeNames.add(key);
    });
    return errors;
  }

  function handleQuickPicksNext() {
    const errors = validateQuickPicks();
    setQuickPicksErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setMaxUnlockedStep((prev) => Math.max(prev, 4));
    setActiveStep(4);
    submit(false);
  }

  function validateComparison() {
    const errors = {};
    if (comparisonSpecs.length === 0) {
      errors.specsCount = 'Add at least one specification before continuing.';
      return errors;
    }
    const seenNames = new Set();
    comparisonSpecs.forEach((spec) => {
      const trimmedName = spec.specificationName.trim();
      if (!trimmedName) {
        errors[`spec-name-${spec.clientId}`] = 'Specification name is required.';
      } else {
        const key = trimmedName.toLowerCase();
        if (seenNames.has(key)) {
          errors[`spec-name-${spec.clientId}`] = 'Two specifications cannot use the same name.';
        } else {
          seenNames.add(key);
        }
      }
      spec.values.forEach((value) => {
        if (!value.value.trim()) {
          errors[`spec-value-${spec.clientId}-${value.productId}`] = 'A value is required.';
        }
      });
    });
    return errors;
  }

  function handleComparisonNext() {
    const errors = validateComparison();
    setComparisonErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setMaxUnlockedStep((prev) => Math.max(prev, 5));
    submit(false);
  }

  async function submit(forcePublish) {
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(buildPayload(forcePublish));
    } catch (error) {
      setFieldErrors(error.fieldErrors ?? {});
      if (!error.fieldErrors) {
        setFormError(error.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const previewProps = {
    title: basicInfo.title,
    excerpt: basicInfo.excerpt,
    coverImageFilename: basicInfo.coverImageFilename,
    tocEntries,
    settings,
    quickRecommendations,
    comparisonSpecs,
    comparisonProducts: recommendedProducts,
  };

  return (
    <div>
      {formError && (
        <p role="alert" className="mb-4 rounded-btn bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <EditorHeader
        isEditMode={Boolean(guide)}
        status={basicInfo.status}
        onPreview={() => setIsPreviewOpen(true)}
        onSaveDraft={() => submit(false)}
        onPublish={() => submit(true)}
        onCancel={onCancel}
        onMenuClick={onMenuClick}
        isSubmitting={isSubmitting}
      />

      <Stepper activeStep={activeStep} maxUnlockedStep={maxUnlockedStep} onStepClick={setActiveStep} />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-[72%]">
          {activeStep === 1 && (
            <>
              <BasicInfoStep
                values={basicInfo}
                onChange={handleBasicInfoChange}
                categories={categories}
                fieldErrors={fieldErrors}
                tocEntries={tocEntries}
                onTocEntriesChange={setTocEntries}
                introduction={introduction}
                onIntroductionChange={setIntroduction}
              />
              <div className="mt-6 flex justify-end">
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              </div>
            </>
          )}
          {activeStep === 2 && (
            <>
              <ProductsStep
                selectedProducts={recommendedProducts}
                onSelectedProductsChange={setRecommendedProducts}
                categories={categories}
              />
              <div className="mt-6 flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setActiveStep(1)}>
                  Previous
                </Button>
                <Button type="button" onClick={handleProductsNext}>
                  Next
                </Button>
              </div>
            </>
          )}
          {activeStep === 3 && (
            <>
              <BuyingGuideQuickPicksStep
                quickRecommendations={quickRecommendations}
                onChange={setQuickRecommendations}
                recommendedProducts={recommendedProducts}
                fieldErrors={quickPicksErrors}
              />
              {quickPicksErrors.quickPicksCount && (
                <p role="alert" className="mt-4 text-sm text-danger">
                  {quickPicksErrors.quickPicksCount}
                </p>
              )}
              <div className="mt-6 flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setActiveStep(2)}>
                  Previous
                </Button>
                <Button type="button" onClick={handleQuickPicksNext}>
                  Next
                </Button>
              </div>
            </>
          )}
          {activeStep === 4 && (
            <>
              <BuyingGuideComparisonStep
                comparisonSpecs={comparisonSpecs}
                onChange={setComparisonSpecs}
                recommendedProducts={recommendedProducts}
                fieldErrors={comparisonErrors}
                onManageProducts={() => setActiveStep(2)}
              />
              {comparisonErrors.specsCount && (
                <p role="alert" className="mt-4 text-sm text-danger">
                  {comparisonErrors.specsCount}
                </p>
              )}
              <div className="mt-6 flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setActiveStep(3)}>
                  Previous
                </Button>
                <Button type="button" onClick={handleComparisonNext}>
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
        <div className="hidden lg:block lg:w-[28%]">
          <div className="sticky top-32">
            <LivePreview {...previewProps} />
          </div>
        </div>
      </div>

      <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Preview">
        <LivePreview {...previewProps} />
      </Modal>
    </div>
  );
}

export default BuyingGuideForm;
