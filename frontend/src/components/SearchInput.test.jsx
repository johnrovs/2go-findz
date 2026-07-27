import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import SearchInput from './SearchInput.jsx';

describe('SearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onChange after the debounce delay, not on every keystroke', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    render(<SearchInput value="" onChange={onChange} />);

    await user.type(screen.getByLabelText('Search products'), 'ear');
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(onChange).toHaveBeenCalledWith('ear');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('reflects an externally-updated value (e.g. cleared via the URL)', () => {
    const { rerender } = render(<SearchInput value="earbuds" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Search products')).toHaveValue('earbuds');

    rerender(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Search products')).toHaveValue('');
  });
});
