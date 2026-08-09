import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PublishStatusCard from './PublishStatusCard.jsx';

function renderCard(overrides = {}) {
  return render(
    <PublishStatusCard
      status="Draft"
      scheduledPublishAt=""
      publishedAt=""
      updatedAt=""
      updatedBy=""
      guideUrl=""
      onPublish={vi.fn()}
      onSchedule={vi.fn()}
      onCancelSchedule={vi.fn()}
      {...overrides}
    />
  );
}

describe('PublishStatusCard', () => {
  it('shows the draft explanation and a Publish Guide button', () => {
    renderCard();
    expect(screen.getByText(/in draft mode/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish Guide' })).toBeInTheDocument();
  });

  it('shows the scheduled date and a Cancel Schedule button', () => {
    renderCard({ status: 'Scheduled', scheduledPublishAt: '2026-09-01T10:00' });
    expect(screen.getByText(/Scheduled to publish on/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel Schedule' })).toBeInTheDocument();
  });

  it('shows View Live Guide and relabels the primary action when Published', () => {
    renderCard({ status: 'Published', publishedAt: '2026-08-01T10:00', guideUrl: 'https://2gofindz.com/buying-guides/x' });
    expect(screen.getByText('View Live Guide →')).toHaveAttribute('href', 'https://2gofindz.com/buying-guides/x');
    expect(screen.getByRole('button', { name: 'Update Published Guide' })).toBeInTheDocument();
  });

  it('shows Last saved and Saved by when provided', () => {
    renderCard({ updatedAt: '2026-08-03T09:00', updatedBy: 'John Rommel' });
    expect(screen.getByText(/Saved by: John Rommel/)).toBeInTheDocument();
  });

  it('calls onPublish when the primary action is clicked', async () => {
    const onPublish = vi.fn();
    const user = userEvent.setup();
    renderCard({ onPublish });

    await user.click(screen.getByRole('button', { name: 'Publish Guide' }));

    expect(onPublish).toHaveBeenCalled();
  });
});
