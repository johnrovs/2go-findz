import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RecommendationBadgeField from './RecommendationBadgeField.jsx';

describe('RecommendationBadgeField', () => {
  it('renders the current value', () => {
    render(<RecommendationBadgeField id="badge-1" value="Best Overall" onChange={vi.fn()} error={null} />);
    expect(screen.getByLabelText('Recommendation Badge')).toHaveValue('Best Overall');
  });

  it('calls onChange as the admin types', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RecommendationBadgeField id="badge-1" value="Best Overall" onChange={onChange} error={null} />);

    await user.type(screen.getByLabelText('Recommendation Badge'), '!');

    expect(onChange).toHaveBeenCalledWith('Best Overall!');
  });

  it('shows an inline error when provided', () => {
    render(<RecommendationBadgeField id="badge-1" value="" onChange={vi.fn()} error="Recommendation badge is required." />);
    expect(screen.getByText('Recommendation badge is required.')).toBeInTheDocument();
  });
});
