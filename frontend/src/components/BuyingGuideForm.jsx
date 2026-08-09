import { useEffect, useState } from 'react';
import EditorHeader from './buying-guide-form/EditorHeader.jsx';
import Stepper from './buying-guide-form/Stepper.jsx';
import BasicInfoStep from './buying-guide-form/BasicInfoStep.jsx';
import ProductsStep from './buying-guide-form/ProductsStep.jsx';
import BuyingGuideQuickPicksStep from './buying-guide-form/BuyingGuideQuickPicksStep.jsx';
import BuyingGuideComparisonStep from './buying-guide-form/BuyingGuideComparisonStep.jsx';
import TopPicksAndRunnerUpsStep from './buying-guide-form/TopPicksAndRunnerUpsStep.jsx';
import BuyingGuideContentStep from './buying-guide-form/BuyingGuideContentStep.jsx';
import BuyingGuideFaqsStep from './buying-guide-form/BuyingGuideFaqsStep.jsx';
import BuyingGuideSeoPublishStep from './buying-guide-form/BuyingGuideSeoPublishStep.jsx';
import LivePreview from './buying-guide-form/LivePreview.jsx';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { getSettings } from '../services/settingsService.js';
import { slugify } from '../utils/slugify.js';
import { buildGuideUrl } from '../utils/siteUrl.js';

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
    clientId: crypto.randomUUID(),
    product: section.product,
    recommendationType: section.recommendationType,
    sectionLabel: section.sectionLabel,
    whyRecommended: section.whyRecommended,
    pros: section.pros.map((item) => ({ clientId: crypto.randomUUID(), content: item.content })),
    cons: section.cons.map((item) => ({ clientId: crypto.randomUUID(), content: item.content })),
    bestFor: section.bestFor.map((item) => ({ clientId: crypto.randomUUID(), content: item.content })),
  }));
}

function mapFaqsFromResponse(faqs) {
  return (faqs ?? []).map((faq) => ({ clientId: crypto.randomUUID(), question: faq.question, answer: faq.answer }));
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
  const [recommendationSections, setRecommendationSections] = useState(mapRecommendationSectionsFromResponse(guide?.recommendationSections));
  const [topPicksRunnerUpsErrors, setTopPicksRunnerUpsErrors] = useState({});
  const [buyingGuideContentErrors, setBuyingGuideContentErrors] = useState({});
  const [faqs, setFaqs] = useState(mapFaqsFromResponse(guide?.faqs));
  const [faqsErrors, setFaqsErrors] = useState({});
  const [seoTitle, setSeoTitle] = useState(guide?.seoTitle ?? null);
  const [seoDescription, setSeoDescription] = useState(guide?.seoDescription ?? null);
  const [focusKeyword, setFocusKeyword] = useState(guide?.focusKeyword ?? '');
  const [supportingKeywords, setSupportingKeywords] = useState(guide?.supportingKeywords ?? []);
  const [canonicalUrl, setCanonicalUrl] = useState(guide?.canonicalUrl ?? '');
  const [visibility, setVisibility] = useState(guide?.visibility ?? 'PUBLIC');
  const [advancedSeo, setAdvancedSeo] = useState({
    robotsIndex: guide?.robotsIndex ?? true,
    robotsFollow: guide?.robotsFollow ?? true,
    openGraphTitle: guide?.openGraphTitle ?? '',
    openGraphDescription: guide?.openGraphDescription ?? '',
    openGraphImageFilename: guide?.openGraphImageFilename ?? null,
    twitterCardType: guide?.twitterCardType ?? 'summary_large_image',
  });
  const [isConfirmingPublish, setIsConfirmingPublish] = useState(false);
  const [isConfirmingUnpublish, setIsConfirmingUnpublish] = useState(false);
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
    const recommendedProductIds = new Set(recommendedProducts.map((product) => product.id));
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
    setRecommendationSections((prev) => prev.filter((section) => recommendedProductIds.has(section.product.id)));
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

  function buildPayload(forcePublish, statusOverride) {
    // setBasicInfo() is async; a caller that just called it (e.g. handleSchedule)
    // and immediately calls submit() would otherwise read the pre-update status
    // from this closure. statusOverride lets those callers pass the intended
    // status/scheduledPublishAt directly instead of racing React's state update.
    const effectiveStatus = statusOverride?.status ?? basicInfo.status;
    const effectiveScheduledPublishAt = statusOverride?.scheduledPublishAt ?? basicInfo.scheduledPublishAt;
    const { active, scheduledPublishAt } = forcePublish
      ? { active: true, scheduledPublishAt: null }
      : effectiveStatus === 'Published'
        ? { active: true, scheduledPublishAt: null }
        : effectiveStatus === 'Scheduled'
          ? { active: false, scheduledPublishAt: `${effectiveScheduledPublishAt}:00` }
          : { active: false, scheduledPublishAt: null };

    return {
      title: basicInfo.title.trim(),
      slug: basicInfo.slug.trim(),
      excerpt: basicInfo.excerpt.trim(),
      introduction,
      coverImageFilename: basicInfo.coverImageFilename,
      categoryId: Number(basicInfo.categoryId),
      seoTitle: seoTitle ?? basicInfo.title,
      seoDescription: seoDescription ?? basicInfo.excerpt,
      active,
      scheduledPublishAt,
      focusKeyword: focusKeyword.trim(),
      supportingKeywords,
      canonicalUrl: canonicalUrl.trim() || null,
      visibility,
      robotsIndex: advancedSeo.robotsIndex,
      robotsFollow: advancedSeo.robotsFollow,
      openGraphTitle: advancedSeo.openGraphTitle.trim() || null,
      openGraphDescription: advancedSeo.openGraphDescription.trim() || null,
      openGraphImageFilename: advancedSeo.openGraphImageFilename,
      twitterCardType: advancedSeo.twitterCardType,
      recommendedProductIds: recommendedProducts.map((product) => product.id),
      quickRecommendations: quickRecommendations.map(({ product, badgeName }) => ({
        productId: product.id,
        badgeName: badgeName.trim(),
      })),
      comparisonSpecs: comparisonSpecs.map(({ specificationName, values }) => ({
        specificationName: specificationName.trim(),
        values: values.map(({ productId, value }) => ({ productId, value: value.trim() })),
      })),
      recommendationSections: recommendationSections.map(
        ({ product, recommendationType, sectionLabel, whyRecommended, pros, cons, bestFor }) => ({
          productId: product.id,
          recommendationType,
          sectionLabel: sectionLabel.trim(),
          whyRecommended,
          pros: pros.map(({ content }) => ({ content: content.trim() })),
          cons: cons.map(({ content }) => ({ content: content.trim() })),
          bestFor: bestFor.map(({ content }) => ({ content: content.trim() })),
        })
      ),
      faqs: faqs.map(({ question, answer }) => ({ question: question.trim(), answer: answer.trim() })),
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
    // Comparison exists past this point, so this auto-save must not navigate away like a
    // Save as Draft/Publish click does -- the user needs to land on Comparison, not the list.
    submit(false, { stayOnPage: true });
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
    setActiveStep(5);
    // Top Picks & Runner-Ups exists past this point, so this auto-save must not navigate
    // away like a Save as Draft/Publish click does -- mirrors handleQuickPicksNext.
    submit(false, { stayOnPage: true });
  }

  function countWords(html) {
    const text = html.replace(/<[^>]*>/g, ' ').trim();
    return text ? text.split(/\s+/).length : 0;
  }

  function validateTopPicksAndRunnerUps() {
    const errors = {};
    const topPick = recommendationSections.find((section) => section.recommendationType === 'TOP_PICK');
    if (!topPick) {
      errors.topPickMissing = 'Select a Top Pick before continuing.';
      return errors;
    }
    recommendationSections.forEach((section) => {
      const key = section.clientId;
      if (!section.sectionLabel.trim()) {
        errors[`badge-${key}`] = 'Recommendation badge is required.';
      }
      const words = countWords(section.whyRecommended);
      if (words < 10) {
        errors[`why-${key}`] = 'Why We Recommend It needs at least 10 words.';
      } else if (words > 150) {
        errors[`why-${key}`] = 'Why We Recommend It must be 150 words or fewer.';
      }
      if (section.pros.length === 0 || section.pros.some((item) => !item.content.trim())) {
        errors[`pros-${key}`] = 'Add at least one Pro.';
      }
      if (section.cons.length === 0 || section.cons.some((item) => !item.content.trim())) {
        errors[`cons-${key}`] = 'Add at least one Con.';
      }
      if (section.bestFor.length === 0 || section.bestFor.some((item) => !item.content.trim())) {
        errors[`bestFor-${key}`] = 'Add at least one Best For item.';
      }
    });
    return errors;
  }

  function handleTopPicksRunnerUpsNext() {
    const errors = validateTopPicksAndRunnerUps();
    setTopPicksRunnerUpsErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setMaxUnlockedStep((prev) => Math.max(prev, 6));
    setActiveStep(6);
    // Buying Guide (step 6) now exists, so this auto-save must not navigate away like a
    // Save as Draft/Publish click does -- mirrors handleQuickPicksNext/handleComparisonNext.
    submit(false, { stayOnPage: true });
  }

  function validateBuyingGuideContent() {
    const errors = {};
    const seenTitles = new Set();
    tocEntries
      .filter((entry) => !entry.sectionKey)
      .forEach((entry) => {
        const trimmedTitle = entry.title.trim();
        if (!trimmedTitle) {
          errors[`title-${entry.clientId}`] = 'Section title is required.';
        } else {
          const key = trimmedTitle.toLowerCase();
          if (seenTitles.has(key)) {
            errors[`title-${entry.clientId}`] = 'Two sections cannot use the same title.';
          } else {
            seenTitles.add(key);
          }
        }
        if (!entry.content.replace(/<[^>]*>/g, '').trim()) {
          errors[`content-${entry.clientId}`] = 'Section content is required.';
        }
      });
    return errors;
  }

  function handleBuyingGuideContentNext() {
    const errors = validateBuyingGuideContent();
    setBuyingGuideContentErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setMaxUnlockedStep((prev) => Math.max(prev, 7));
    setActiveStep(7);
    // FAQs (step 7) now exists, so this auto-save must not navigate away like a Save as
    // Draft/Publish click does -- mirrors every prior step's Next handler once the step
    // after it existed.
    submit(false, { stayOnPage: true });
  }

  function validateFaqs() {
    const errors = {};
    if (faqs.length === 0) {
      errors.faqsCount = 'Add at least one FAQ before continuing.';
      return errors;
    }
    const seenQuestions = new Set();
    faqs.forEach((faq) => {
      const trimmedQuestion = faq.question.trim();
      if (!trimmedQuestion) {
        errors[`question-${faq.clientId}`] = 'Question is required.';
      } else {
        const key = trimmedQuestion.toLowerCase();
        if (seenQuestions.has(key)) {
          errors[`question-${faq.clientId}`] = 'Two FAQs cannot use the same question.';
        } else {
          seenQuestions.add(key);
        }
      }
      if (!faq.answer.trim()) {
        errors[`answer-${faq.clientId}`] = 'Answer is required.';
      }
    });
    return errors;
  }

  function handleFaqsNext() {
    const errors = validateFaqs();
    setFaqsErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setMaxUnlockedStep((prev) => Math.max(prev, 8));
    setActiveStep(8);
    submit(false, { stayOnPage: true });
  }

  function handleRequestPublish() {
    setIsConfirmingPublish(true);
  }

  function handleConfirmPublish() {
    setIsConfirmingPublish(false);
    submit(true);
  }

  function handleCancelPublish() {
    setIsConfirmingPublish(false);
  }

  function handleSchedule(scheduledValue) {
    setBasicInfo((prev) => ({ ...prev, status: 'Scheduled', scheduledPublishAt: scheduledValue }));
    submit(false, { stayOnPage: true, statusOverride: { status: 'Scheduled', scheduledPublishAt: scheduledValue } });
  }

  function handleCancelSchedule() {
    setBasicInfo((prev) => ({ ...prev, status: 'Draft', scheduledPublishAt: '' }));
    submit(false, { stayOnPage: true, statusOverride: { status: 'Draft' } });
  }

  function handleRequestUnpublish() {
    setIsConfirmingUnpublish(true);
  }

  function handleConfirmUnpublish() {
    setIsConfirmingUnpublish(false);
    setBasicInfo((prev) => ({ ...prev, status: 'Draft' }));
    submit(false, { stayOnPage: true, statusOverride: { status: 'Draft' } });
  }

  function handleCancelUnpublish() {
    setIsConfirmingUnpublish(false);
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(buildGuideUrl(basicInfo.slug));
  }

  const checklistItems = [
    { id: 'basicInfo', label: 'Basic Info completed', isComplete: Object.keys(validate()).length === 0, step: 1 },
    { id: 'products', label: 'At least one product added', isComplete: recommendedProducts.length > 0, step: 2 },
    { id: 'quickPicks', label: 'Quick Picks completed', isComplete: Object.keys(validateQuickPicks()).length === 0, step: 3 },
    { id: 'comparison', label: 'Comparison completed', isComplete: Object.keys(validateComparison()).length === 0, step: 4 },
    {
      id: 'topPicksRunnerUps',
      label: 'Top Pick and Runner-Ups completed',
      isComplete: Object.keys(validateTopPicksAndRunnerUps()).length === 0,
      step: 5,
    },
    {
      id: 'buyingGuideContent',
      label: 'Buying Guide content completed',
      isComplete: Object.keys(validateBuyingGuideContent()).length === 0,
      step: 6,
    },
    { id: 'faqs', label: 'FAQ requirements completed', isComplete: Object.keys(validateFaqs()).length === 0, step: 7 },
    {
      id: 'seo',
      label: 'SEO title and description added',
      isComplete: Boolean((seoTitle ?? basicInfo.title).trim()) && Boolean((seoDescription ?? basicInfo.excerpt).trim()),
      step: 8,
    },
    { id: 'visibility', label: 'Visibility is selected', isComplete: Boolean(visibility), step: 8 },
  ];

  async function submit(forcePublish, { stayOnPage = false, statusOverride } = {}) {
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(buildPayload(forcePublish, statusOverride), { stayOnPage });
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
    recommendationSections,
    faqs,
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
        onRequestPublish={handleRequestPublish}
        onSchedule={() => setActiveStep(8)}
        onCopyLink={handleCopyLink}
        onUnpublish={handleRequestUnpublish}
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
          {activeStep === 5 && (
            <>
              <TopPicksAndRunnerUpsStep
                recommendationSections={recommendationSections}
                onChange={setRecommendationSections}
                recommendedProducts={recommendedProducts}
                fieldErrors={topPicksRunnerUpsErrors}
              />
              {topPicksRunnerUpsErrors.topPickMissing && (
                <p role="alert" className="mt-4 text-sm text-danger">
                  {topPicksRunnerUpsErrors.topPickMissing}
                </p>
              )}
              <div className="mt-6 flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setActiveStep(4)}>
                  Previous
                </Button>
                <Button type="button" onClick={handleTopPicksRunnerUpsNext}>
                  Next
                </Button>
              </div>
            </>
          )}
          {activeStep === 6 && (
            <>
              <BuyingGuideContentStep tocEntries={tocEntries} onChange={setTocEntries} fieldErrors={buyingGuideContentErrors} />
              {Object.keys(buyingGuideContentErrors).length > 0 && (
                <p role="alert" className="mt-4 text-sm text-danger">
                  One or more sections need attention before continuing.
                </p>
              )}
              <div className="mt-6 flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setActiveStep(5)}>
                  Previous
                </Button>
                <Button type="button" onClick={handleBuyingGuideContentNext}>
                  Next
                </Button>
              </div>
            </>
          )}
          {activeStep === 7 && (
            <>
              <BuyingGuideFaqsStep faqs={faqs} onChange={setFaqs} fieldErrors={faqsErrors} />
              {faqsErrors.faqsCount && (
                <p role="alert" className="mt-4 text-sm text-danger">
                  {faqsErrors.faqsCount}
                </p>
              )}
              <div className="mt-6 flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setActiveStep(6)}>
                  Previous
                </Button>
                <Button type="button" onClick={handleFaqsNext}>
                  Next
                </Button>
              </div>
            </>
          )}
          {activeStep === 8 && (
            <>
              <BuyingGuideSeoPublishStep
                seoTitle={seoTitle}
                onSeoTitleChange={setSeoTitle}
                basicInfoTitle={basicInfo.title}
                metaDescription={seoDescription}
                onMetaDescriptionChange={setSeoDescription}
                basicInfoExcerpt={basicInfo.excerpt}
                focusKeyword={focusKeyword}
                onFocusKeywordChange={setFocusKeyword}
                supportingKeywords={supportingKeywords}
                onSupportingKeywordsChange={setSupportingKeywords}
                canonicalUrl={canonicalUrl}
                onCanonicalUrlChange={setCanonicalUrl}
                advancedSeo={advancedSeo}
                onAdvancedSeoChange={setAdvancedSeo}
                slug={basicInfo.slug}
                introduction={introduction}
                tocEntries={tocEntries}
                faqs={faqs}
                quickRecommendations={quickRecommendations}
                recommendationSections={recommendationSections}
                coverImageFilename={basicInfo.coverImageFilename}
                visibility={visibility}
                onVisibilityChange={setVisibility}
                status={basicInfo.status}
                scheduledPublishAt={basicInfo.scheduledPublishAt}
                publishedAt={guide?.publishedAt}
                updatedAt={guide?.updatedAt}
                updatedBy={guide?.updatedBy}
                checklistItems={checklistItems}
                onNavigateStep={setActiveStep}
                onRequestPublish={handleRequestPublish}
                onSchedule={handleSchedule}
                onCancelSchedule={handleCancelSchedule}
              />
              <div className="mt-6 flex justify-start">
                <Button type="button" variant="secondary" onClick={() => setActiveStep(7)}>
                  Previous
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

      <ConfirmDialog
        isOpen={isConfirmingPublish}
        title="Publish this guide?"
        message="This makes the guide live immediately, overriding its current status and any scheduled date."
        confirmLabel="Publish"
        isLoading={isSubmitting}
        onConfirm={handleConfirmPublish}
        onCancel={handleCancelPublish}
      />

      <ConfirmDialog
        isOpen={isConfirmingUnpublish}
        title="Unpublish this guide?"
        message="This moves the guide back to Draft and removes it from public view immediately."
        confirmLabel="Unpublish"
        isDestructive
        isLoading={isSubmitting}
        onConfirm={handleConfirmUnpublish}
        onCancel={handleCancelUnpublish}
      />
    </div>
  );
}

export default BuyingGuideForm;
