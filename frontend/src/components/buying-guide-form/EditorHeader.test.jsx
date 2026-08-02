import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import EditorHeader from './EditorHeader.jsx';

function renderHeader(overrides = {}) {
  return render(
    <EditorHeader
      isEditMode={false}
      status="Draft"
      onPreview={vi.fn()}
      onSaveDraft={vi.fn()}
      onPublish={vi.fn()}
      onCancel={vi.fn()}
      isSubmitting={false}
      {...overrides}
    />
  );
}

describe('EditorHeader', () => {
  it('shows "Add Buying Guide" and the current status when not editing', () => {
    renderHeader({ status: 'Draft' });
    expect(screen.getByRole('heading', { name: 'Add Buying Guide' })).toBeInTheDocument();
    expect(screen.getByText('Draft', { selector: 'span' })).toBeInTheDocument();
  });

  it('shows "Edit Buying Guide" when editing', () => {
    renderHeader({ isEditMode: true, status: 'Scheduled' });
    expect(screen.getByRole('heading', { name: 'Edit Buying Guide' })).toBeInTheDocument();
    expect(screen.getByText('Scheduled', { selector: 'span' })).toBeInTheDocument();
  });

  it('calls onCancel when the back link is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderHeader({ onCancel });

    await user.click(screen.getByRole('button', { name: /Buying Guides/ }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onPreview and onSaveDraft directly, without a confirm step', async () => {
    const onPreview = vi.fn();
    const onSaveDraft = vi.fn();
    const user = userEvent.setup();
    renderHeader({ onPreview, onSaveDraft });

    await user.click(screen.getByRole('button', { name: 'Preview' }));
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    expect(onPreview).toHaveBeenCalled();
    expect(onSaveDraft).toHaveBeenCalled();
  });

  it('requires confirmation before calling onPublish', async () => {
    const onPublish = vi.fn();
    const user = userEvent.setup();
    renderHeader({ onPublish });

    await user.click(screen.getByRole('button', { name: 'Publish Guide' }));
    expect(onPublish).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(onPublish).toHaveBeenCalled();
  });

  it('disables all action buttons while submitting', () => {
    renderHeader({ isSubmitting: true });
    expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publishing...' })).toBeDisabled();
  });
});
