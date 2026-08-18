import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FaqEditorRow from './FaqEditorRow.jsx';

function renderRow(overrides = {}) {
  const faq = { clientId: 'f1', question: 'Is it worth it?', answer: 'Yes, absolutely.' };
  const props = {
    faq,
    index: 0,
    total: 2,
    onFieldChange: vi.fn(),
    onRequestDelete: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    isExpanded: false,
    onToggleExpanded: vi.fn(),
    questionError: undefined,
    answerError: undefined,
    ...overrides,
  };
  return { ...render(<ul><FaqEditorRow {...props} /></ul>), props };
}

describe('FaqEditorRow', () => {
  it('shows the position number and question', () => {
    renderRow();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Is it worth it?')).toBeInTheDocument();
  });

  it('shows a character counter for the question', () => {
    renderRow();
    expect(screen.getByText('15 / 300')).toBeInTheDocument();
  });

  it('does not render the answer field when collapsed', () => {
    renderRow({ isExpanded: false });
    expect(screen.queryByLabelText('Answer')).not.toBeInTheDocument();
  });

  it('renders the answer field when expanded', () => {
    renderRow({ isExpanded: true });
    expect(screen.getByDisplayValue('Yes, absolutely.')).toBeInTheDocument();
  });

  it('calls onFieldChange when the question is edited', async () => {
    const user = userEvent.setup();
    const { props } = renderRow();

    await user.type(screen.getByDisplayValue('Is it worth it?'), '!');

    expect(props.onFieldChange).toHaveBeenCalledWith('f1', 'question', 'Is it worth it?!');
  });

  it('calls onToggleExpanded when the expand/collapse button is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderRow();

    await user.click(screen.getByRole('button', { name: /expand is it worth it/i }));

    expect(props.onToggleExpanded).toHaveBeenCalledWith('f1');
  });

  it('calls onRequestDelete with the faq when delete is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderRow();

    await user.click(screen.getByRole('button', { name: /delete is it worth it/i }));

    expect(props.onRequestDelete).toHaveBeenCalledWith(props.faq);
  });

  it('disables Move up on the first item and Move down on the last item', () => {
    renderRow({ index: 0, total: 2 });
    expect(screen.getByRole('button', { name: /move is it worth it\? up/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move is it worth it\? down/i })).toBeEnabled();
  });

  it('shows a question validation error', () => {
    renderRow({ questionError: 'Question is required.' });
    expect(screen.getByText('Question is required.')).toBeInTheDocument();
  });

  it('shows an answer validation error when expanded', () => {
    renderRow({ isExpanded: true, answerError: 'Answer is required.' });
    expect(screen.getByText('Answer is required.')).toBeInTheDocument();
  });
});
