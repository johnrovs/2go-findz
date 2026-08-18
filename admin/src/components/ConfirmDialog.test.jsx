import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog.jsx';

describe('ConfirmDialog', () => {
  it('renders the title and message when open', () => {
    render(
      <ConfirmDialog
        isOpen
        title="Delete Category"
        message="This cannot be undone."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('alertdialog', { name: 'Delete Category' })).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        isOpen
        title="Delete Category"
        message="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when the cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog isOpen title="Delete Category" message="msg" onConfirm={vi.fn()} onCancel={onCancel} />
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('disables both buttons while isLoading', () => {
    render(
      <ConfirmDialog
        isOpen
        title="Delete Category"
        message="msg"
        confirmLabel="Delete"
        isLoading
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Please wait...' })).toBeDisabled();
  });

  it('styles the confirm button destructively when isDestructive is true', () => {
    render(
      <ConfirmDialog
        isOpen
        title="Delete Category"
        message="msg"
        confirmLabel="Delete"
        isDestructive
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-danger');
  });

  it('focuses the cancel button by default, not the destructive action', async () => {
    render(
      <ConfirmDialog
        isOpen
        title="Delete Category"
        message="msg"
        confirmLabel="Delete"
        isDestructive
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });
});
