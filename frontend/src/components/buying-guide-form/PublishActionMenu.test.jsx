import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PublishActionMenu from './PublishActionMenu.jsx';

function renderMenu(overrides = {}) {
  return render(
    <PublishActionMenu
      status="Draft"
      disabled={false}
      onPreview={vi.fn()}
      onSaveDraft={vi.fn()}
      onSchedule={vi.fn()}
      onCopyLink={vi.fn()}
      onUnpublish={vi.fn()}
      {...overrides}
    />
  );
}

describe('PublishActionMenu', () => {
  it('opens the menu and calls onSchedule, closing after', async () => {
    const onSchedule = vi.fn();
    const user = userEvent.setup();
    renderMenu({ onSchedule });

    await user.click(screen.getByLabelText('More publish options'));
    await user.click(screen.getByRole('menuitem', { name: 'Schedule Publish' }));

    expect(onSchedule).toHaveBeenCalled();
    expect(screen.queryByRole('menuitem', { name: 'Schedule Publish' })).not.toBeInTheDocument();
  });

  it('does not show Unpublish when status is Draft', async () => {
    const user = userEvent.setup();
    renderMenu({ status: 'Draft' });
    await user.click(screen.getByLabelText('More publish options'));
    expect(screen.queryByRole('menuitem', { name: 'Unpublish' })).not.toBeInTheDocument();
  });

  it('shows Unpublish when status is Published', async () => {
    const user = userEvent.setup();
    renderMenu({ status: 'Published' });
    await user.click(screen.getByLabelText('More publish options'));
    expect(screen.getByRole('menuitem', { name: 'Unpublish' })).toBeInTheDocument();
  });

  it('calls onCopyLink when Copy Preview Link is clicked', async () => {
    const onCopyLink = vi.fn();
    const user = userEvent.setup();
    renderMenu({ onCopyLink });
    await user.click(screen.getByLabelText('More publish options'));
    await user.click(screen.getByRole('menuitem', { name: 'Copy Preview Link' }));
    expect(onCopyLink).toHaveBeenCalled();
  });
});
