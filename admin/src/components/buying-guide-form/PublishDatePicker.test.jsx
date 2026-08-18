import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PublishDatePicker from './PublishDatePicker.jsx';

describe('PublishDatePicker', () => {
  it('renders empty when value is empty', () => {
    render(<PublishDatePicker id="scheduledPublishAt" value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Select date and time')).toHaveValue('');
  });

  it('displays the formatted value when one is provided', () => {
    render(<PublishDatePicker id="scheduledPublishAt" value="2099-01-01T10:00" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Select date and time')).toHaveValue('01/01/2099 10:00 AM');
  });

  it('calls onChange with a naive local-time string when a date and time are typed and committed', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PublishDatePicker id="scheduledPublishAt" value="" onChange={onChange} />);

    const input = screen.getByPlaceholderText('Select date and time');
    await user.type(input, '01/01/2099 10:00 AM{Enter}');

    expect(onChange).toHaveBeenCalledWith('2099-01-01T10:00');
  });

  it('shows a validation error when provided', () => {
    render(<PublishDatePicker id="scheduledPublishAt" value="" onChange={vi.fn()} error="Publish date is required." />);
    expect(screen.getByText('Publish date is required.')).toBeInTheDocument();
  });
});
