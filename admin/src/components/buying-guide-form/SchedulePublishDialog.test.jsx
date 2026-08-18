import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SchedulePublishDialog from './SchedulePublishDialog.jsx';

describe('SchedulePublishDialog', () => {
  it('does not render when closed', () => {
    render(<SchedulePublishDialog isOpen={false} initialValue="" onConfirm={vi.fn()} onCancel={vi.fn()} isLoading={false} />);
    expect(screen.queryByText('Schedule Publish')).not.toBeInTheDocument();
  });

  it('disables Schedule Guide when no date is chosen', () => {
    render(<SchedulePublishDialog isOpen={true} initialValue="" onConfirm={vi.fn()} onCancel={vi.fn()} isLoading={false} />);
    expect(screen.getByRole('button', { name: 'Schedule Guide' })).toBeDisabled();
  });

  it('enables Schedule Guide once a future date is prefilled', () => {
    const future = new Date(Date.now() + 86400000);
    const value = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}T12:00`;
    render(<SchedulePublishDialog isOpen={true} initialValue={value} onConfirm={vi.fn()} onCancel={vi.fn()} isLoading={false} />);
    expect(screen.getByRole('button', { name: 'Schedule Guide' })).toBeEnabled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<SchedulePublishDialog isOpen={true} initialValue="" onConfirm={vi.fn()} onCancel={onCancel} isLoading={false} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
  });
});
