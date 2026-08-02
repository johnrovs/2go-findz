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

  it('reveals and requires a future Publish Date only when Status is Scheduled', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Status'), 'Scheduled');
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    expect(await screen.findByText('Publish date is required.')).toBeInTheDocument();
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
});
