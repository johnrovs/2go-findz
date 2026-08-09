import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideSeoPublishStep from './BuyingGuideSeoPublishStep.jsx';

function renderStep(overrides = {}) {
  return render(
    <BuyingGuideSeoPublishStep
      seoTitle={null}
      onSeoTitleChange={vi.fn()}
      basicInfoTitle="Best Wireless Earbuds Under $100"
      metaDescription={null}
      onMetaDescriptionChange={vi.fn()}
      basicInfoExcerpt="A curated guide to the best budget wireless earbuds."
      focusKeyword=""
      onFocusKeywordChange={vi.fn()}
      supportingKeywords={[]}
      onSupportingKeywordsChange={vi.fn()}
      canonicalUrl=""
      onCanonicalUrlChange={vi.fn()}
      advancedSeo={{
        robotsIndex: true,
        robotsFollow: true,
        openGraphTitle: '',
        openGraphDescription: '',
        openGraphImageFilename: null,
        twitterCardType: 'summary_large_image',
      }}
      onAdvancedSeoChange={vi.fn()}
      slug="best-wireless-earbuds-under-100"
      introduction="<p>Looking for great sound on a budget?</p>"
      tocEntries={[]}
      faqs={[]}
      quickRecommendations={[]}
      recommendationSections={[]}
      coverImageFilename={null}
      visibility="PUBLIC"
      onVisibilityChange={vi.fn()}
      status="Draft"
      scheduledPublishAt=""
      publishedAt=""
      updatedAt=""
      updatedBy=""
      checklistItems={[{ id: 'basicInfo', label: 'Basic Info completed', isComplete: true, step: 1 }]}
      onNavigateStep={vi.fn()}
      onRequestPublish={vi.fn()}
      onSchedule={vi.fn()}
      onCancelSchedule={vi.fn()}
      {...overrides}
    />
  );
}

describe('BuyingGuideSeoPublishStep', () => {
  it('renders the page heading and description', () => {
    renderStep();
    expect(screen.getByRole('heading', { name: 'SEO & Publish' })).toBeInTheDocument();
    expect(screen.getByText(/Optimize your buying guide for search engines/)).toBeInTheDocument();
  });

  it('falls back the SEO title/description to Basic Info when uncustomized', () => {
    renderStep();
    expect(screen.getByLabelText(/SEO Title/)).toHaveValue('Best Wireless Earbuds Under $100');
    expect(screen.getByLabelText(/Meta Description/)).toHaveValue('A curated guide to the best budget wireless earbuds.');
  });

  it('renders the Guide Visibility and Before You Publish cards', () => {
    renderStep();
    expect(screen.getByText('Guide Visibility')).toBeInTheDocument();
    expect(screen.getByText('Basic Info completed')).toBeInTheDocument();
  });

  it('opens the full SEO analysis dialog from the score card', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByText(/View full SEO analysis/));

    expect(screen.getByText('Full SEO Analysis')).toBeInTheDocument();
  });

  it('opens the schedule dialog from the Publish Status card', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole('button', { name: 'Schedule Publish' }));

    expect(screen.getByText('Schedule Publish', { selector: 'h2' })).toBeInTheDocument();
  });

  it('does not call onSchedule when Schedule Guide is clicked with no date chosen', async () => {
    const onSchedule = vi.fn();
    const user = userEvent.setup();
    renderStep({ onSchedule });

    await user.click(screen.getByRole('button', { name: 'Schedule Publish' }));
    await user.click(screen.getByRole('button', { name: 'Schedule Guide' }));

    expect(onSchedule).not.toHaveBeenCalled();
  });
});
