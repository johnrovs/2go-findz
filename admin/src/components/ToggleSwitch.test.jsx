import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ToggleSwitch from './ToggleSwitch.jsx';

describe('ToggleSwitch', () => {
  it('renders the label and helper text', () => {
    render(<ToggleSwitch label="Active" helperText="Visible on the storefront" checked onChange={vi.fn()} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Visible on the storefront')).toBeInTheDocument();
  });

  it('reflects the checked state via aria-checked', () => {
    render(<ToggleSwitch label="Trending" checked={false} onChange={vi.fn()} />);
    expect(screen.getByRole('switch', { name: 'Trending' })).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with the toggled value when clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ToggleSwitch label="Best Seller" checked={false} onChange={onChange} />);

    await user.click(screen.getByRole('switch', { name: 'Best Seller' }));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders without helper text when none is provided', () => {
    render(<ToggleSwitch label="Schedule for later" checked={false} onChange={vi.fn()} />);
    expect(screen.getByText('Schedule for later')).toBeInTheDocument();
  });
});
