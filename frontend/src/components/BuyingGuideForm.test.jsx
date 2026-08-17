import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BuyingGuideForm from './BuyingGuideForm.jsx';
import * as settingsService from '../services/settingsService.js';

vi.mock('./buying-guide-form/IntroductionEditor.jsx', () => ({
  default: ({ value, onChange, error }) => (
    <div>
      <textarea aria-label="Introduction" value={value} onChange={(event) => onChange(event.target.value)} />
      {error && <p>{error}</p>}
    </div>
  ),
}));

vi.mock('./buying-guide-form/PublishDatePicker.jsx', () => ({
  default: ({ id, value, onChange, error }) => (
    <div>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
      {error && <p>{error}</p>}
    </div>
  ),
}));

vi.mock('./buying-guide-form/ProductsStep.jsx', () => ({
  default: ({ selectedProducts, onSelectedProductsChange }) => (
    <div>
      <p>Products step ({selectedProducts.length} selected)</p>
      <button
        type="button"
        onClick={() => onSelectedProductsChange([...selectedProducts, { id: 99, name: 'Mock Product' }])}
      >
        Add mock product
      </button>
    </div>
  ),
}));

vi.mock('./buying-guide-form/BuyingGuideQuickPicksStep.jsx', () => ({
  default: ({ quickRecommendations, onChange }) => (
    <div>
      <p>Quick Picks step ({quickRecommendations.length} added)</p>
      <button
        type="button"
        onClick={() =>
          onChange([...quickRecommendations, { product: { id: 99, name: 'Mock Product' }, badgeName: 'Best Overall' }])
        }
      >
        Add mock quick pick
      </button>
    </div>
  ),
}));

vi.mock('./buying-guide-form/BuyingGuideComparisonStep.jsx', () => ({
  default: ({ comparisonSpecs, onChange, recommendedProducts, onManageProducts }) => (
    <div>
      <p>
        Comparison step ({comparisonSpecs.length} specs, {recommendedProducts.length} products)
      </p>
      <button
        type="button"
        onClick={() =>
          onChange([
            ...comparisonSpecs,
            {
              clientId: 'mock-spec',
              specificationName: 'Battery Life',
              values: recommendedProducts.map((p) => ({ productId: p.id, value: '40 Hrs' })),
            },
          ])
        }
      >
        Add mock spec
      </button>
      <button type="button" onClick={onManageProducts}>
        Go to Products
      </button>
    </div>
  ),
}));

vi.mock('./buying-guide-form/TopPicksAndRunnerUpsStep.jsx', () => ({
  default: ({ recommendationSections, onChange, recommendedProducts }) => (
    <div>
      <p>
        Top Picks &amp; Runner-Ups step ({recommendationSections.length} recommendations, {recommendedProducts.length} products)
      </p>
      <button
        type="button"
        onClick={() =>
          onChange([
            ...recommendationSections,
            {
              clientId: 'mock-top-pick',
              product: recommendedProducts[0],
              recommendationType: 'TOP_PICK',
              sectionLabel: 'Best Overall',
              whyRecommended: '<p>Great sound quality and long battery life for the price.</p>',
              pros: [{ clientId: 'mock-pro', content: 'Great sound' }],
              cons: [{ clientId: 'mock-con', content: 'Pricey' }],
              bestFor: [{ clientId: 'mock-best-for', content: 'Daily commuters' }],
            },
          ])
        }
      >
        Add mock Top Pick
      </button>
    </div>
  ),
}));

vi.mock('./buying-guide-form/BuyingGuideContentStep.jsx', () => ({
  default: ({ tocEntries, onChange, fieldErrors }) => {
    const customCount = tocEntries.filter((entry) => !entry.sectionKey).length;
    return (
      <div>
        <p>Buying Guide Content step ({customCount} sections)</p>
        {Object.keys(fieldErrors).length > 0 && <p>Buying Guide Content has field errors</p>}
        <button
          type="button"
          onClick={() =>
            onChange([
              ...tocEntries,
              {
                clientId: 'mock-section',
                sectionKey: null,
                title: 'How We Tested',
                content: '<p>We tested every product for a full week in real-world conditions.</p>',
                visible: true,
              },
            ])
          }
        >
          Add mock section
        </button>
        <button
          type="button"
          onClick={() =>
            onChange([...tocEntries, { clientId: 'mock-blank-section', sectionKey: null, title: '', content: '', visible: true }])
          }
        >
          Add blank mock section
        </button>
      </div>
    );
  },
}));

vi.mock('./buying-guide-form/BuyingGuideFaqsStep.jsx', () => ({
  default: ({ faqs, onChange, fieldErrors }) => (
    <div>
      <p>FAQs step ({faqs.length} FAQs)</p>
      {Object.keys(fieldErrors).length > 0 && <p>FAQs have field errors</p>}
      <button
        type="button"
        onClick={() =>
          onChange([...faqs, { clientId: 'mock-faq', question: 'Is it worth it?', answer: 'Yes, absolutely.' }])
        }
      >
        Add mock FAQ
      </button>
      <button
        type="button"
        onClick={() => onChange([...faqs, { clientId: 'mock-blank-faq', question: '', answer: '' }])}
      >
        Add blank mock FAQ
      </button>
    </div>
  ),
}));

vi.mock('./buying-guide-form/BuyingGuideSeoPublishStep.jsx', () => ({
  default: ({ onNavigateStep, onSchedule, onCancelSchedule }) => (
    <div>
      <p>SEO & Publish step</p>
      <button type="button" onClick={() => onNavigateStep(7)}>
        Go to FAQs from checklist
      </button>
      <button type="button" onClick={() => onSchedule('2099-01-01T10:00')}>
        Trigger schedule
      </button>
      <button type="button" onClick={() => onCancelSchedule()}>
        Trigger cancel schedule
      </button>
    </div>
  ),
}));

const categories = [{ id: 1, productCategoryName: 'Kitchen' }];

function renderForm(props = {}) {
  return render(<BuyingGuideForm guide={null} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} {...props} />);
}

async function fillRequiredFields(user) {
  await user.type(screen.getByLabelText('Title'), 'Guide Title');
  await user.type(screen.getByLabelText('Excerpt'), 'Excerpt text.');
  await user.selectOptions(screen.getByLabelText('Category'), '1');
  await user.type(screen.getByLabelText('Introduction'), 'Full introduction text.');
}

describe('BuyingGuideForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ affiliateDisclosure: 'Disclosure.' });
  });

  it('renders the Basic Info fields directly, with no tabs', () => {
    renderForm();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Slug')).toBeInTheDocument();
    expect(screen.getByLabelText('Excerpt')).toBeInTheDocument();
  });

  it('starts a new guide with the five structural TOC entries, all visible', () => {
    renderForm();
    const tocList = screen.getByRole('list', { name: 'Table of contents entries' });
    expect(within(tocList).getByText('Quick Recommendations')).toBeInTheDocument();
    expect(within(tocList).getByText('Comparison Table')).toBeInTheDocument();
    expect(within(tocList).getByText('Top Pick')).toBeInTheDocument();
    expect(within(tocList).getByText('Runner-Ups')).toBeInTheDocument();
    expect(within(tocList).getByText('FAQs')).toBeInTheDocument();
  });

  it('auto-derives the slug from the title until the slug is hand-edited', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Title'), 'Best Kitchen Gadgets');
    expect(screen.getByLabelText('Slug')).toHaveValue('best-kitchen-gadgets');

    await user.clear(screen.getByLabelText('Slug'));
    await user.type(screen.getByLabelText('Slug'), 'custom-slug');
    await user.type(screen.getByLabelText('Title'), '!');

    expect(screen.getByLabelText('Slug')).toHaveValue('custom-slug');
  });

  it('shows validation errors when Save as Draft is clicked with empty required fields', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    expect(await screen.findByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Slug is required.')).toBeInTheDocument();
    expect(screen.getByText('Excerpt is required.')).toBeInTheDocument();
    expect(screen.getByText('Category is required.')).toBeInTheDocument();
    expect(screen.getByText('Introduction is required.')).toBeInTheDocument();
  });

  it('requires a future Publish Date only when Status is Scheduled', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Status'), 'Scheduled');
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    expect(await screen.findByText('Publish date is required.')).toBeInTheDocument();
  });

  it('does not clear a picked Publish Date when Status changes away from Scheduled', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Status'), 'Scheduled');
    await user.type(screen.getByLabelText('Publish Date'), '2099-01-01T10:00');
    await user.selectOptions(screen.getByLabelText('Status'), 'Draft');

    expect(screen.getByLabelText('Publish Date')).toHaveValue('2099-01-01T10:00');
  });

  it('submits active:true and a null scheduledPublishAt when Status is Published', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });

    await fillRequiredFields(user);
    await user.selectOptions(screen.getByLabelText('Status'), 'Published');
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.active).toBe(true);
    expect(payload.scheduledPublishAt).toBeNull();
  });

  it('Save as Draft persists whatever Status is currently set, without forcing Draft', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });

    await fillRequiredFields(user);
    await user.selectOptions(screen.getByLabelText('Status'), 'Scheduled');
    await user.type(screen.getByLabelText('Publish Date'), '2099-01-01T10:00');
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.active).toBe(false);
    expect(payload.scheduledPublishAt).toBe('2099-01-01T10:00:00');
  });

  it('Publish Guide overrides Status to active:true after confirmation, regardless of the dropdown', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Publish Guide' }));
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.active).toBe(true);
    expect(payload.scheduledPublishAt).toBeNull();
  });

  function publishedGuideFixture() {
    return {
      id: 7,
      title: 'Existing Guide',
      slug: 'existing-guide',
      excerpt: 'Existing excerpt.',
      introduction: '<p>Intro</p>',
      coverImageFilename: null,
      categoryId: 1,
      seoTitle: null,
      seoDescription: null,
      active: true,
      scheduledPublishAt: null,
      recommendedProducts: [],
      quickRecommendations: [],
      comparisonSpecs: [],
      recommendationSections: [],
      faqs: [],
      tocEntries: [
        { id: 1, sectionKey: 'QUICK_RECOMMENDATIONS', title: null, content: null, visible: true },
        { id: 2, sectionKey: 'COMPARISON_TABLE', title: null, content: null, visible: true },
        { id: 3, sectionKey: 'TOP_PICK', title: null, content: null, visible: true },
        { id: 4, sectionKey: 'RUNNER_UPS', title: null, content: null, visible: true },
        { id: 5, sectionKey: 'FAQS', title: null, content: null, visible: true },
      ],
    };
  }

  it('Unpublish requires confirmation before submitting active:false', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<BuyingGuideForm guide={publishedGuideFixture()} categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByLabelText('More publish options'));
    await user.click(screen.getByRole('menuitem', { name: 'Unpublish' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Unpublish' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.active).toBe(false);
  });

  it('Cancel on the Unpublish confirm dialog leaves the guide published', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<BuyingGuideForm guide={publishedGuideFixture()} categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByLabelText('More publish options'));
    await user.click(screen.getByRole('menuitem', { name: 'Unpublish' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('calls onCancel from the header back link', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderForm({ onCancel });

    await user.click(screen.getByRole('button', { name: /Buying Guides/ }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('passes onMenuClick through to the header mobile menu button', async () => {
    const onMenuClick = vi.fn();
    const user = userEvent.setup();
    renderForm({ onMenuClick });

    await user.click(screen.getByLabelText('Open menu'));

    expect(onMenuClick).toHaveBeenCalled();
  });

  it('pre-fills every Basic Info field when editing an existing guide', () => {
    const guide = {
      id: 7,
      title: 'Existing Guide',
      slug: 'existing-guide',
      excerpt: 'Existing excerpt.',
      introduction: '<p>Intro</p>',
      coverImageFilename: 'img_existing.webp',
      categoryId: 1,
      seoTitle: null,
      seoDescription: null,
      active: true,
      scheduledPublishAt: null,
      recommendedProducts: [],
      quickRecommendations: [],
      comparisonSpecs: [],
      recommendationSections: [],
      faqs: [],
      tocEntries: [
        { id: 1, sectionKey: 'QUICK_RECOMMENDATIONS', title: null, content: null, visible: true },
        { id: 2, sectionKey: 'COMPARISON_TABLE', title: null, content: null, visible: true },
        { id: 3, sectionKey: 'TOP_PICK', title: null, content: null, visible: true },
        { id: 4, sectionKey: 'RUNNER_UPS', title: null, content: null, visible: true },
        { id: 5, sectionKey: 'FAQS', title: null, content: null, visible: true },
      ],
    };
    render(<BuyingGuideForm guide={guide} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Title')).toHaveValue('Existing Guide');
    expect(screen.getByLabelText('Slug')).toHaveValue('existing-guide');
    expect(screen.getByRole('heading', { name: 'Edit Buying Guide' })).toBeInTheDocument();
    expect(screen.getByText('Published', { selector: 'span' })).toBeInTheDocument();
  });

  it('round-trips quickRecommendations, comparisonSpecs, recommendationSections, faqs, recommendedProductIds, and SEO fields unchanged on save', async () => {
    const guide = {
      id: 7,
      title: 'Existing Guide',
      slug: 'existing-guide',
      excerpt: 'Existing excerpt.',
      introduction: '<p>Intro</p>',
      coverImageFilename: null,
      categoryId: 1,
      seoTitle: 'Existing SEO Title',
      seoDescription: 'Existing SEO description.',
      active: false,
      scheduledPublishAt: null,
      recommendedProducts: [{ id: 42, name: 'Blender' }],
      quickRecommendations: [{ id: 1, product: { id: 42, name: 'Blender' }, badgeName: 'Best Overall' }],
      comparisonSpecs: [
        { id: 1, specificationName: 'Weight', values: [{ id: 1, product: { id: 42, name: 'Blender' }, specificationValue: '2kg' }] },
      ],
      recommendationSections: [
        {
          id: 1,
          product: { id: 42, name: 'Blender' },
          recommendationType: 'TOP_PICK',
          sectionLabel: 'Best Overall',
          whyRecommended: 'Powerful motor.',
          pros: [{ id: 1, content: 'Fast' }],
          cons: [{ id: 2, content: 'Loud' }],
          bestFor: [{ id: 3, content: 'Smoothies' }],
        },
      ],
      faqs: [{ id: 1, question: 'Is it dishwasher safe?', answer: 'Yes.' }],
      tocEntries: [
        { id: 1, sectionKey: 'QUICK_RECOMMENDATIONS', title: null, content: null, visible: true },
        { id: 2, sectionKey: 'COMPARISON_TABLE', title: null, content: null, visible: true },
        { id: 3, sectionKey: 'TOP_PICK', title: null, content: null, visible: true },
        { id: 4, sectionKey: 'RUNNER_UPS', title: null, content: null, visible: true },
        { id: 5, sectionKey: 'FAQS', title: null, content: null, visible: true },
      ],
    };
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<BuyingGuideForm guide={guide} categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.recommendedProductIds).toEqual([42]);
    expect(payload.quickRecommendations).toEqual([{ productId: 42, badgeName: 'Best Overall' }]);
    expect(payload.comparisonSpecs).toEqual([{ specificationName: 'Weight', values: [{ productId: 42, value: '2kg' }] }]);
    expect(payload.recommendationSections).toEqual([
      {
        productId: 42,
        recommendationType: 'TOP_PICK',
        sectionLabel: 'Best Overall',
        whyRecommended: 'Powerful motor.',
        pros: [{ content: 'Fast' }],
        cons: [{ content: 'Loud' }],
        bestFor: [{ content: 'Smoothies' }],
      },
    ]);
    expect(payload.faqs).toEqual([{ question: 'Is it dishwasher safe?', answer: 'Yes.' }]);
    expect(payload.seoTitle).toBe('Existing SEO Title');
    expect(payload.seoDescription).toBe('Existing SEO description.');
  });

  it('sends empty collections for a brand-new guide, with SEO title/description falling back to Basic Info', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.recommendedProductIds).toEqual([]);
    expect(payload.quickRecommendations).toEqual([]);
    expect(payload.comparisonSpecs).toEqual([]);
    expect(payload.recommendationSections).toEqual([]);
    expect(payload.faqs).toEqual([]);
    // No custom SEO Title/Meta Description has been entered (that happens on step 8), so the
    // payload falls back to Basic Info's Title/Excerpt -- the guide never saves with a blank
    // SEO title, matching the SeoSettingsForm prefill-until-edited behavior.
    expect(payload.seoTitle).toBe('Guide Title');
    expect(payload.seoDescription).toBe('Excerpt text.');
  });

  it('strips the internal clientId from every TOC entry before submitting', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.tocEntries).toHaveLength(5);
    payload.tocEntries.forEach((entry) => expect(entry).not.toHaveProperty('clientId'));
  });

  it('submits null title and content for structural TOC entries, not empty strings', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    payload.tocEntries.forEach((entry) => {
      expect(entry.title).toBeNull();
      expect(entry.content).toBeNull();
    });
  });

  it('shows a server-side field error and re-enables the button on a failed submit', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ fieldErrors: { slug: 'Slug is already in use.' } });
    const user = userEvent.setup();
    renderForm({ onSubmit });

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    expect(await screen.findByText('Slug is already in use.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save as Draft' })).toBeEnabled();
  });

  it('opens the live preview modal from the header Preview button', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Title'), 'Preview Me');
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByRole('heading', { name: 'Preview' })).toBeInTheDocument();
    expect(screen.getAllByText('Preview Me').length).toBeGreaterThan(0);
  });

  it('opens a wide modal showing the real page layout, with no toggle inside it, when Desktop is clicked in the sidebar preview', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Title'), 'Sidebar Desktop Preview');
    await user.click(screen.getByRole('button', { name: 'Preview on desktop' }));

    const dialog = screen.getByRole('dialog', { name: 'Preview' });
    expect(dialog).toHaveClass('max-w-5xl');
    expect(within(dialog).getByRole('heading', { level: 1, name: 'Sidebar Desktop Preview' })).toBeInTheDocument();

    // Only the sidebar's own toggle button exists now -- the dialog no longer has one.
    expect(screen.getAllByRole('button', { name: 'Preview on desktop' })).toHaveLength(1);
    expect(within(dialog).queryByRole('button', { name: 'Preview on mobile' })).not.toBeInTheDocument();
  });

  it('Next on Basic Info validates required fields before advancing', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
  });

  it('Next on Basic Info advances to the Products step once valid, and unlocks it in the Stepper', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Products step (0 selected)')).toBeInTheDocument();
    const productsStepButton = screen.getByRole('button', { name: /Products/ });
    expect(productsStepButton).toBeEnabled();
    expect(productsStepButton).toHaveAttribute('aria-current', 'step');
  });

  it('Previous on the Products step returns to Basic Info without losing entered data', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Products step (0 selected)');

    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(screen.getByLabelText('Title')).toHaveValue('Guide Title');
  });

  it('adding a product on the Products step flows into recommendedProductIds on save', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));

    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.recommendedProductIds).toEqual([99]);
  });

  it('Next on the Products step advances to Quick Picks and unlocks it in the Stepper', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Products step (0 selected)');

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Quick Picks step (0 added)')).toBeInTheDocument();
    const quickPicksButton = screen.getByRole('button', { name: /Quick Picks/ });
    expect(quickPicksButton).toBeEnabled();
    expect(quickPicksButton).toHaveAttribute('aria-current', 'step');
  });

  it('Previous on Quick Picks returns to Products without losing the selection', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Quick Picks step (0 added)');

    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(await screen.findByText('Products step (1 selected)')).toBeInTheDocument();
  });

  it('adding a quick pick and saving includes it in the quickRecommendations payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));

    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.quickRecommendations).toEqual([{ productId: 99, badgeName: 'Best Overall' }]);
  });

  it('Next on Quick Picks blocks with an error when no quick picks have been added', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Quick Picks step (0 added)');

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText(/add at least one quick pick/i)).toBeInTheDocument();
  });

  it('Next on Quick Picks advances to Comparison and unlocks it in the Stepper', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Comparison step (0 specs, 1 products)')).toBeInTheDocument();
    const comparisonButton = screen.getByRole('button', { name: /Comparison/ });
    expect(comparisonButton).toBeEnabled();
    expect(comparisonButton).toHaveAttribute('aria-current', 'step');
  });

  it('Previous on Comparison returns to Quick Picks without losing state', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Comparison step (0 specs, 1 products)');

    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(await screen.findByText('Quick Picks step (1 added)')).toBeInTheDocument();
  });

  it('the manage-products link on Comparison jumps to the Products step', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Go to Products' }));

    expect(await screen.findByText('Products step (1 selected)')).toBeInTheDocument();
  });

  it('adding a comparison spec and saving includes it in the comparisonSpecs payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));

    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    // Next on Quick Picks auto-saves too, so this is not necessarily the first call --
    // the assertion needs the most recent submission, made after the mock spec was added.
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls.at(-1)[0];
    expect(payload.comparisonSpecs).toEqual([
      { specificationName: 'Battery Life', values: [{ productId: 99, value: '40 Hrs' }] },
    ]);
  });

  it('Next on Comparison blocks with an error when no specifications have been added', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Comparison step (0 specs, 1 products)');

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText(/add at least one specification/i)).toBeInTheDocument();
  });

  it('Next on Comparison advances to Top Picks & Runner-Ups and unlocks it in the Stepper', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Top Picks & Runner-Ups step (0 recommendations, 1 products)')).toBeInTheDocument();
    const step5Button = screen.getByRole('button', { name: /Top Picks & Runner-Ups/ });
    expect(step5Button).toBeEnabled();
    expect(step5Button).toHaveAttribute('aria-current', 'step');
  });

  it('Previous on Top Picks & Runner-Ups returns to Comparison without losing state', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Top Picks & Runner-Ups step (0 recommendations, 1 products)');

    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(await screen.findByText(/comparison step \(1 specs/i)).toBeInTheDocument();
  });

  it('adding a Top Pick and saving includes it in the recommendationSections payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));

    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls.at(-1)[0];
    expect(payload.recommendationSections).toEqual([
      {
        productId: 99,
        recommendationType: 'TOP_PICK',
        sectionLabel: 'Best Overall',
        whyRecommended: '<p>Great sound quality and long battery life for the price.</p>',
        pros: [{ content: 'Great sound' }],
        cons: [{ content: 'Pricey' }],
        bestFor: [{ content: 'Daily commuters' }],
      },
    ]);
  });

  it('Next on Top Picks & Runner-Ups blocks with an error when no Top Pick has been selected', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Top Picks & Runner-Ups step (0 recommendations, 1 products)');

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText(/select a top pick before continuing/i)).toBeInTheDocument();
  });

  it('Next on Top Picks & Runner-Ups advances to Buying Guide and unlocks it in the Stepper', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Buying Guide Content step (0 sections)')).toBeInTheDocument();
    const step6Button = screen.getByRole('button', { name: /Buying Guide$/ });
    expect(step6Button).toBeEnabled();
    expect(step6Button).toHaveAttribute('aria-current', 'step');
  });

  it('Previous on Buying Guide returns to Top Picks & Runner-Ups without losing state', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Buying Guide Content step (0 sections)');

    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(await screen.findByText(/top picks & runner-ups step \(1 recommendations/i)).toBeInTheDocument();
  });

  it('adding a section and saving includes it in the tocEntries payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock section' }));

    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls.at(-1)[0];
    const customEntry = payload.tocEntries.find((entry) => entry.sectionKey === null);
    expect(customEntry).toEqual({
      sectionKey: null,
      title: 'How We Tested',
      content: '<p>We tested every product for a full week in real-world conditions.</p>',
      visible: true,
    });
  });

  it('Next on Buying Guide blocks with an error when a section has a blank title', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add blank mock section' }));

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Buying Guide Content has field errors')).toBeInTheDocument();
    expect(screen.getByText('Buying Guide Content step (1 sections)')).toBeInTheDocument();
  });

  it('Next on Buying Guide advances to FAQs and unlocks it in the Stepper', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock section' }));

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('FAQs step (0 FAQs)')).toBeInTheDocument();
    const step7Button = screen.getByRole('button', { name: /FAQs$/ });
    expect(step7Button).toBeEnabled();
    expect(step7Button).toHaveAttribute('aria-current', 'step');
  });

  it('Previous on FAQs returns to Buying Guide without losing state', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock section' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('FAQs step (0 FAQs)');

    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(await screen.findByText('Buying Guide Content step (1 sections)')).toBeInTheDocument();
  });

  it('adding a FAQ and saving includes it in the faqs payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock section' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock FAQ' }));

    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls.at(-1)[0];
    expect(payload.faqs).toEqual([{ question: 'Is it worth it?', answer: 'Yes, absolutely.' }]);
  });

  it('Next on FAQs blocks with an error when a FAQ has a blank question', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock section' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add blank mock FAQ' }));

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('FAQs have field errors')).toBeInTheDocument();
    expect(screen.getByText('FAQs step (1 FAQs)')).toBeInTheDocument();
  });

  it('Next on FAQs blocks with an error when there are no FAQs', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock section' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('FAQs step (0 FAQs)');

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText(/add at least one faq/i)).toBeInTheDocument();
  });

  it('Next on FAQs advances to SEO & Publish and unlocks it in the Stepper', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock section' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock FAQ' }));

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('SEO & Publish step')).toBeInTheDocument();
    const step8Button = screen.getByRole('button', { name: /SEO & Publish$/ });
    expect(step8Button).toBeEnabled();
    expect(step8Button).toHaveAttribute('aria-current', 'step');
  });

  it('Previous on SEO & Publish returns to FAQs without losing state', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock section' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock FAQ' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('SEO & Publish step');

    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(await screen.findByText('FAQs step (1 FAQs)')).toBeInTheDocument();
  });

  async function navigateToSeoPublishStep(user) {
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock section' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock FAQ' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('SEO & Publish step');
  }

  it('Schedule Publish submits the newly chosen Scheduled status and date, not the pre-update status', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await navigateToSeoPublishStep(user);
    onSubmit.mockClear();

    await user.click(screen.getByRole('button', { name: 'Trigger schedule' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.active).toBe(false);
    expect(payload.scheduledPublishAt).toBe('2099-01-01T10:00:00');
  });

  it('Cancel Schedule submits Draft immediately, not the pre-update status', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await navigateToSeoPublishStep(user);
    await user.click(screen.getByRole('button', { name: 'Trigger schedule' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    onSubmit.mockClear();

    await user.click(screen.getByRole('button', { name: 'Trigger cancel schedule' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.active).toBe(false);
    expect(payload.scheduledPublishAt).toBeNull();
  });
});
