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

  it('sends empty collections and null SEO fields for a brand-new guide', async () => {
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
    expect(payload.seoTitle).toBeNull();
    expect(payload.seoDescription).toBeNull();
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
});
