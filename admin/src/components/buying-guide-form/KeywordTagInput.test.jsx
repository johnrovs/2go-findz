import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import KeywordTagInput from './KeywordTagInput.jsx';

describe('KeywordTagInput', () => {
  it('adds a keyword on Enter and clears the input', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<KeywordTagInput keywords={[]} onChange={onChange} />);

    await user.type(screen.getByRole('textbox'), 'budget earbuds{Enter}');

    expect(onChange).toHaveBeenCalledWith(['budget earbuds']);
  });

  it('adds a keyword on comma', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<KeywordTagInput keywords={[]} onChange={onChange} />);

    await user.type(screen.getByRole('textbox'), 'bluetooth,');

    expect(onChange).toHaveBeenCalledWith(['bluetooth']);
  });

  it('removes a keyword when its remove button is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<KeywordTagInput keywords={['budget', 'bluetooth']} onChange={onChange} />);

    await user.click(screen.getByLabelText('Remove budget'));

    expect(onChange).toHaveBeenCalledWith(['bluetooth']);
  });

  it('removes the last keyword on Backspace when the input is empty', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<KeywordTagInput keywords={['budget', 'bluetooth']} onChange={onChange} />);

    await user.click(screen.getByRole('textbox'));
    await user.keyboard('{Backspace}');

    expect(onChange).toHaveBeenCalledWith(['budget']);
  });

  it('blocks a case-insensitive duplicate', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<KeywordTagInput keywords={['Budget']} onChange={onChange} />);

    await user.type(screen.getByRole('textbox'), 'budget{Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('blocks adding past the 10-keyword maximum', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const tenKeywords = Array.from({ length: 10 }, (_, i) => `keyword-${i}`);
    render(<KeywordTagInput keywords={tenKeywords} onChange={onChange} />);

    expect(screen.getByRole('textbox')).toBeDisabled();
    await user.type(screen.getByRole('textbox'), 'x{Enter}');
    expect(onChange).not.toHaveBeenCalled();
  });
});
