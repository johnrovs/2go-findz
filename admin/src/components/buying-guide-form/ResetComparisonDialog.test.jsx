import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ResetComparisonDialog from './ResetComparisonDialog.jsx';

describe('ResetComparisonDialog', () => {
  it('renders nothing when closed', () => {
    render(<ResetComparisonDialog isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onConfirm when Reset Comparison is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ResetComparisonDialog isOpen={true} onClose={vi.fn()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Reset Comparison' }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ResetComparisonDialog isOpen={true} onClose={onClose} onConfirm={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });
});
