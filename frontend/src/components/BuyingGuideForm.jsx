import { useEffect, useState } from 'react';
import EditorHeader from './buying-guide-form/EditorHeader.jsx';
import Stepper from './buying-guide-form/Stepper.jsx';
import BasicInfoStep from './buying-guide-form/BasicInfoStep.jsx';
import LivePreview from './buying-guide-form/LivePreview.jsx';
import Modal from './Modal.jsx';
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

function mapQuickRecommendationsFromResponse(quickRecommendations) {
  return (quickRecommendations ?? []).map((r) => ({ productId: r.product.id, badgeName: r.badgeName }));
}

function mapComparisonSpecsFromResponse(comparisonSpecs) {
  return (comparisonSpecs ?? []).map((spec) => ({
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

function BuyingGuideForm({ guide, categories, onSubmit, onCancel }) {
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
  const [recommendedProductIds] = useState((guide?.recommendedProducts ?? []).map((p) => p.id));
  const [quickRecommendations] = useState(mapQuickRecommendationsFromResponse(guide?.quickRecommendations));
  const [comparisonSpecs] = useState(mapComparisonSpecsFromResponse(guide?.comparisonSpecs));
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
      if (field === 'status') {
        return { ...prev, status: value, scheduledPublishAt: value === 'Scheduled' ? prev.scheduledPublishAt : '' };
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
      recommendedProductIds,
      quickRecommendations,
      comparisonSpecs,
      recommendationSections,
      faqs,
      tocEntries: tocEntries.map(({ clientId, ...entry }) => entry),
    };
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
        isSubmitting={isSubmitting}
      />

      <Stepper />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-[72%]">
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
