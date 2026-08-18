import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SeoSettingsForm from './SeoSettingsForm.jsx';

function renderForm(overrides = {}) {
  return render(
    <SeoSettingsForm
      seoTitleDisplay="Best Wireless Earbuds Under $100"
      isSeoTitleCustom={false}
      onSeoTitleChange={vi.fn()}
      onResetSeoTitle={vi.fn()}
      metaDescriptionDisplay="A curated guide to the best budget wireless earbuds."
      isMetaDescriptionCustom={false}
      onMetaDescriptionChange={vi.fn()}
      onResetMetaDescription={vi.fn()}
      focusKeyword=""
      onFocusKeywordChange={vi.fn()}
      focusKeywordAnalysis={{ inTitle: false, inDescription: false, inSlug: false, inContent: false }}
      supportingKeywords={[]}
      onSupportingKeywordsChange={vi.fn()}
      canonicalUrl=""
      onCanonicalUrlChange={vi.fn()}
      canonicalError=""
      canonicalWarning=""
      guideUrl="https://2gofindz.com/buying-guides/best-wireless-earbuds-under-100"
      {...overrides}
    />
  );
}

describe('SeoSettingsForm', () => {
  it('renders the prefilled SEO title and meta description', () => {
    renderForm();
    expect(screen.getByLabelText(/SEO Title/)).toHaveValue('Best Wireless Earbuds Under $100');
    expect(screen.getByLabelText(/Meta Description/)).toHaveValue('A curated guide to the best budget wireless earbuds.');
  });

  it('does not show a reset link until the title is custom', () => {
    const { rerender } = renderForm({ isSeoTitleCustom: false });
    expect(screen.queryByText('Reset to guide title')).not.toBeInTheDocument();
    rerender(
      <SeoSettingsForm
        seoTitleDisplay="Custom Title"
        isSeoTitleCustom={true}
        onSeoTitleChange={vi.fn()}
        onResetSeoTitle={vi.fn()}
        metaDescriptionDisplay=""
        isMetaDescriptionCustom={false}
        onMetaDescriptionChange={vi.fn()}
        onResetMetaDescription={vi.fn()}
        focusKeyword=""
        onFocusKeywordChange={vi.fn()}
        focusKeywordAnalysis={{ inTitle: false, inDescription: false, inSlug: false, inContent: false }}
        supportingKeywords={[]}
        onSupportingKeywordsChange={vi.fn()}
        canonicalUrl=""
        onCanonicalUrlChange={vi.fn()}
        canonicalError=""
        canonicalWarning=""
        guideUrl="https://2gofindz.com/buying-guides/x"
      />
    );
    expect(screen.getByText('Reset to guide title')).toBeInTheDocument();
  });

  it('calls onResetSeoTitle when the reset link is clicked', async () => {
    const onResetSeoTitle = vi.fn();
    const user = userEvent.setup();
    renderForm({ isSeoTitleCustom: true, onResetSeoTitle });

    await user.click(screen.getByText('Reset to guide title'));

    expect(onResetSeoTitle).toHaveBeenCalled();
  });

  it('shows the focus keyword usage checklist once a keyword is entered', () => {
    renderForm({
      focusKeyword: 'wireless earbuds',
      focusKeywordAnalysis: { inTitle: true, inDescription: false, inSlug: true, inContent: false },
    });
    expect(screen.getByText('✓ Title')).toBeInTheDocument();
    expect(screen.getByText('✓ Slug')).toBeInTheDocument();
  });

  it('shows a canonical URL warning when provided', () => {
    renderForm({ canonicalWarning: 'This canonical URL points to a different domain.' });
    expect(screen.getByText(/points to a different domain/)).toBeInTheDocument();
  });

  it('calls onCanonicalUrlChange when the field is edited', async () => {
    const onCanonicalUrlChange = vi.fn();
    const user = userEvent.setup();
    renderForm({ onCanonicalUrlChange });

    await user.type(screen.getByLabelText('Canonical URL'), 'x');

    expect(onCanonicalUrlChange).toHaveBeenCalled();
  });
});
