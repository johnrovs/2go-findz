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
  it('renders the featured-image label instead of the default product label', () => {
    renderStep();
    expect(screen.getByText('Featured Image')).toBeInTheDocument();
  });

  it('shows the remaining excerpt character count', () => {
    renderStep({ values: { excerpt: 'Hello' } });
    expect(screen.getByText('245 characters remaining')).toBeInTheDocument();
  });

  it('populates the category select from the categories prop', () => {
    renderStep();
    expect(screen.getByRole('option', { name: 'Kitchen' })).toBeInTheDocument();
  });

  it('only shows the Publish Date field when Status is Scheduled', () => {
    renderStep({ values: { status: 'Scheduled' } });
    expect(screen.getByLabelText('Publish Date')).toBeInTheDocument();
  });

  it('hides the Publish Date field when Status is Draft', () => {
    renderStep({ values: { status: 'Draft' } });
    expect(screen.queryByLabelText('Publish Date')).not.toBeInTheDocument();
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
