import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SeoAnalysisDialog from './SeoAnalysisDialog.jsx';

const checks = [
  { id: 'a', label: 'Passing Check', points: 10, maxPoints: 10, why: 'Why A', recommendation: 'Do A', focusStep: 8, focusFieldId: 'seo-title' },
  { id: 'b', label: 'Partial Check', points: 5, maxPoints: 10, why: 'Why B', recommendation: 'Do B', focusStep: 8, focusFieldId: null },
  { id: 'c', label: 'Failing Check', points: 0, maxPoints: 10, why: 'Why C', recommendation: 'Do C', focusStep: 1, focusFieldId: 'slug' },
];

describe('SeoAnalysisDialog', () => {
  it('renders nothing when closed', () => {
    render(<SeoAnalysisDialog isOpen={false} onClose={vi.fn()} checks={checks} onFocusField={vi.fn()} />);
    expect(screen.queryByText('Full SEO Analysis')).not.toBeInTheDocument();
  });

  it('groups checks into Errors, Warnings, and Passed', () => {
    render(<SeoAnalysisDialog isOpen={true} onClose={vi.fn()} checks={checks} onFocusField={vi.fn()} />);
    expect(screen.getByText('Passing Check')).toBeInTheDocument();
    expect(screen.getByText('Partial Check')).toBeInTheDocument();
    expect(screen.getByText('Failing Check')).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
    expect(screen.getByText('Warnings')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
  });

  it('calls onFocusField with the check\'s step/fieldId and closes on "Go to this field"', async () => {
    const onFocusField = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<SeoAnalysisDialog isOpen={true} onClose={onClose} checks={checks} onFocusField={onFocusField} />);

    await user.click(screen.getAllByText('Go to this field')[0]);

    expect(onFocusField).toHaveBeenCalledWith(1, 'slug');
    expect(onClose).toHaveBeenCalled();
  });
});
