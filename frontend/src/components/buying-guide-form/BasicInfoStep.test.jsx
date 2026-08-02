import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BasicInfoStep from './BasicInfoStep.jsx';

vi.mock('./IntroductionEditor.jsx', () => ({
  default: ({ value, onChange, error }) => (
    <div>
      <textarea aria-label="Introduction" value={value} onChange={(event) => onChange(event.target.value)} />
      {error && <p>{error}</p>}
    </div>
  ),
}));

vi.mock('./PublishDatePicker.jsx', () => ({
  default: ({ id, value, onChange, error }) => (
    <div>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
      {error && <p>{error}</p>}
    </div>
  ),
}));

const categories = [{ id: 1, productCategoryName: 'Kitchen' }];
const baseValues = {
  title: '',
  slug: '',
  excerpt: '',
  coverImageFilename: null,
  categoryId: '',
  status: 'Draft',
  scheduledPublishAt: '',
};

function renderStep(overrides = {}) {
  return render(
    <BasicInfoStep
      values={{ ...baseValues, ...overrides.values }}
      onChange={overrides.onChange ?? vi.fn()}
      categories={categories}
      fieldErrors={overrides.fieldErrors ?? {}}
      tocEntries={overrides.tocEntries ?? []}
      onTocEntriesChange={overrides.onTocEntriesChange ?? vi.fn()}
      introduction={overrides.introduction ?? ''}
      onIntroductionChange={overrides.onIntroductionChange ?? vi.fn()}
    />
  );
}

describe('BasicInfoStep', () => {
  it('renders a Basic Information heading', () => {
    renderStep();
    expect(screen.getByRole('heading', { name: 'Basic Information' })).toBeInTheDocument();
  });

  it('renders the featured-image label instead of the default product label', () => {
    renderStep();
    expect(screen.getByText('Featured Image')).toBeInTheDocument();
  });

  it('shows the excerpt character count as used / max', () => {
    renderStep({ values: { excerpt: 'Hello' } });
    expect(screen.getByText('5 / 250')).toBeInTheDocument();
  });

  it('populates the category select from the categories prop', () => {
    renderStep();
    expect(screen.getByRole('option', { name: 'Kitchen' })).toBeInTheDocument();
  });

  it('always renders the Publish Date field regardless of Status', () => {
    renderStep({ values: { status: 'Draft' } });
    expect(screen.getByLabelText('Publish Date')).toBeInTheDocument();
  });

  it('shows helper text under each field', () => {
    renderStep();
    expect(screen.getByText('Use a clear, keyword-rich title.')).toBeInTheDocument();
    expect(screen.getByText('A short description for search results and social sharing.')).toBeInTheDocument();
    expect(screen.getByText('Select the main category.')).toBeInTheDocument();
    expect(screen.getByText('Set the current status.')).toBeInTheDocument();
    expect(screen.getByText('Set when the guide will be published.')).toBeInTheDocument();
  });

  it('shows field-level validation errors', () => {
    renderStep({ fieldErrors: { title: 'Title is required.' } });
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
  });

  it('calls onChange when the title field is edited', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderStep({ onChange });

    await user.type(screen.getByLabelText('Title'), 'X');

    expect(onChange).toHaveBeenCalledWith('title', 'X');
  });
});
