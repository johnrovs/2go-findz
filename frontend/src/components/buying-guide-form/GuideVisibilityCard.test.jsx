import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GuideVisibilityCard from './GuideVisibilityCard.jsx';

describe('GuideVisibilityCard', () => {
  it('renders all three options', () => {
    render(<GuideVisibilityCard value="PUBLIC" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /Public/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Unlisted/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Private/ })).not.toBeChecked();
  });

  it('calls onChange with the selected value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<GuideVisibilityCard value="PUBLIC" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: /Unlisted/ }));

    expect(onChange).toHaveBeenCalledWith('UNLISTED');
  });

  it('shows the correct description text for Private', () => {
    render(<GuideVisibilityCard value="PRIVATE" onChange={vi.fn()} />);
    expect(screen.getByText('Only authorized administrators can view this guide.')).toBeInTheDocument();
  });
});
