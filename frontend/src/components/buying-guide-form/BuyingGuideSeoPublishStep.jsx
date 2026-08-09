import { useState } from 'react';
import SeoSettingsForm from './SeoSettingsForm.jsx';
import AdvancedSeoPanel from './AdvancedSeoPanel.jsx';
import SeoScoreCard from './SeoScoreCard.jsx';
import SeoAnalysisDialog from './SeoAnalysisDialog.jsx';
import PublishStatusCard from './PublishStatusCard.jsx';
import GuideVisibilityCard from './GuideVisibilityCard.jsx';
import PrePublishChecklist from './PrePublishChecklist.jsx';
import SchedulePublishDialog from './SchedulePublishDialog.jsx';
import { analyzeFocusKeywordUsage } from '../../utils/analyzeFocusKeyword.js';
import { computeSeoScore } from '../../utils/computeSeoScore.js';
import { buildFaqJsonLd } from '../../utils/faqJsonLd.js';
import { buildGuideUrl } from '../../utils/siteUrl.js';

function BuyingGuideSeoPublishStep({
  seoTitle,
  onSeoTitleChange,
  basicInfoTitle,
  metaDescription,
  onMetaDescriptionChange,
  basicInfoExcerpt,
  focusKeyword,
  onFocusKeywordChange,
  supportingKeywords,
  onSupportingKeywordsChange,
  canonicalUrl,
  onCanonicalUrlChange,
  advancedSeo,
  onAdvancedSeoChange,
  slug,
  introduction,
  tocEntries,
  faqs,
  quickRecommendations,
  recommendationSections,
  coverImageFilename,
  visibility,
  onVisibilityChange,
  status,
  scheduledPublishAt,
  publishedAt,
  updatedAt,
  updatedBy,
  checklistItems,
  onNavigateStep,
  onRequestPublish,
  onSchedule,
  onCancelSchedule,
}) {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const isSeoTitleCustom = seoTitle !== null;
  const isMetaDescriptionCustom = metaDescription !== null;
  const seoTitleDisplay = seoTitle ?? basicInfoTitle;
  const metaDescriptionDisplay = metaDescription ?? basicInfoExcerpt;
  const guideUrl = buildGuideUrl(slug);

  const focusKeywordAnalysis = analyzeFocusKeywordUsage(focusKeyword, {
    seoTitle: seoTitleDisplay,
    metaDescription: metaDescriptionDisplay,
    slug,
    introduction,
    tocEntries,
  });

  let canonicalError = '';
  let canonicalWarning = '';
  if (canonicalUrl) {
    try {
      const url = new URL(canonicalUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        canonicalError = 'Canonical URL must use http or https.';
      } else if (url.origin !== new URL(guideUrl).origin) {
        canonicalWarning =
          'This canonical URL points to a different domain — search engines may prefer that page instead of this one.';
      }
    } catch {
      canonicalError = 'Enter a valid absolute URL.';
    }
  }

  const { score, label, checks } = computeSeoScore({
    seoTitle: seoTitleDisplay,
    metaDescription: metaDescriptionDisplay,
    focusKeyword,
    slug,
    introduction,
    canonicalUrl,
    hasStructuredData: Boolean(buildFaqJsonLd(faqs)),
    hasQuickPick: quickRecommendations.length > 0,
    hasTopPick: recommendationSections.some((section) => section.recommendationType === 'TOP_PICK'),
  });

  function handleFocusField(step, fieldId) {
    onNavigateStep(step);
    if (fieldId) {
      setTimeout(() => document.getElementById(fieldId)?.focus(), 0);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-card-title text-heading">SEO & Publish</h2>
      <p className="mb-6 text-sm text-muted">Optimize your buying guide for search engines and prepare it for publication.</p>

      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="space-y-6 xl:w-[68%]">
          <SeoSettingsForm
            seoTitleDisplay={seoTitleDisplay}
            isSeoTitleCustom={isSeoTitleCustom}
            onSeoTitleChange={onSeoTitleChange}
            onResetSeoTitle={() => onSeoTitleChange(null)}
            metaDescriptionDisplay={metaDescriptionDisplay}
            isMetaDescriptionCustom={isMetaDescriptionCustom}
            onMetaDescriptionChange={onMetaDescriptionChange}
            onResetMetaDescription={() => onMetaDescriptionChange(null)}
            focusKeyword={focusKeyword}
            onFocusKeywordChange={onFocusKeywordChange}
            focusKeywordAnalysis={focusKeywordAnalysis}
            supportingKeywords={supportingKeywords}
            onSupportingKeywordsChange={onSupportingKeywordsChange}
            canonicalUrl={canonicalUrl}
            onCanonicalUrlChange={onCanonicalUrlChange}
            canonicalError={canonicalError}
            canonicalWarning={canonicalWarning}
            guideUrl={guideUrl}
          />
          <AdvancedSeoPanel
            values={advancedSeo}
            onChange={onAdvancedSeoChange}
            seoTitleFallback={seoTitleDisplay}
            metaDescriptionFallback={metaDescriptionDisplay}
            coverImageFilenameFallback={coverImageFilename}
          />
        </div>

        <div className="space-y-6 xl:w-[32%]">
          <PublishStatusCard
            status={status}
            scheduledPublishAt={scheduledPublishAt}
            publishedAt={publishedAt}
            updatedAt={updatedAt}
            updatedBy={updatedBy}
            guideUrl={guideUrl}
            onPublish={onRequestPublish}
            onSchedule={() => setIsScheduleOpen(true)}
            onCancelSchedule={onCancelSchedule}
          />
          <SeoScoreCard score={score} label={label} checks={checks} onViewFullAnalysis={() => setIsAnalysisOpen(true)} />
          <GuideVisibilityCard value={visibility} onChange={onVisibilityChange} />
          <PrePublishChecklist items={checklistItems} onNavigate={onNavigateStep} />
        </div>
      </div>

      <SeoAnalysisDialog isOpen={isAnalysisOpen} onClose={() => setIsAnalysisOpen(false)} checks={checks} onFocusField={handleFocusField} />
      <SchedulePublishDialog
        isOpen={isScheduleOpen}
        initialValue={scheduledPublishAt}
        onConfirm={(value) => {
          setIsScheduleOpen(false);
          onSchedule(value);
        }}
        onCancel={() => setIsScheduleOpen(false)}
        isLoading={false}
      />
    </div>
  );
}

export default BuyingGuideSeoPublishStep;
