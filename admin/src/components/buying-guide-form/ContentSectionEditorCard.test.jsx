import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ContentSectionEditorCard from './ContentSectionEditorCard.jsx';

function renderCard(overrides = {}) {
  const entry = { clientId: 'c1', sectionKey: null, title: 'How We Tested', content: '<p>We tested every product.</p>', visible: true };
  const props = {
    entry,
    index: 0,
    total: 2,
    onFieldChange: vi.fn(),
    onToggleVisible: vi.fn(),
    onRequestDelete: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    isExpanded: false,
    onToggleExpanded: vi.fn(),
    titleError: undefined,
    contentError: undefined,
    ...overrides,
  };
  return { ...render(<ul><ContentSectionEditorCard {...props} /></ul>), props };
}

describe('ContentSectionEditorCard', () => {
  it('shows the position number and title', () => {
    renderCard();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('How We Tested')).toBeInTheDocument();
  });

  it('does not render the rich text editor when collapsed', () => {
    renderCard({ isExpanded: false });
    expect(screen.queryByText(/words:/i)).not.toBeInTheDocument();
  });

  it('renders the rich text editor when expanded', () => {
    renderCard({ isExpanded: true });
    expect(screen.getByText(/we tested every product/i)).toBeInTheDocument();
  });

  it('calls onFieldChange when the title is edited', async () => {
    const user = userEvent.setup();
    const { props } = renderCard();

    await user.type(screen.getByDisplayValue('How We Tested'), '!');

    expect(props.onFieldChange).toHaveBeenCalledWith('c1', 'title', 'How We Tested!');
  });

  it('calls onToggleExpanded when the expand/collapse button is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderCard();

    await user.click(screen.getByRole('button', { name: /expand how we tested/i }));

    expect(props.onToggleExpanded).toHaveBeenCalledWith('c1');
  });

  it('calls onToggleVisible when the visibility switch is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderCard();

    await user.click(screen.getByRole('switch'));

    expect(props.onToggleVisible).toHaveBeenCalledWith('c1');
  });

  it('calls onRequestDelete with the entry when delete is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderCard();

    await user.click(screen.getByRole('button', { name: /delete how we tested/i }));

    expect(props.onRequestDelete).toHaveBeenCalledWith(props.entry);
  });

  it('disables Move up on the first item and Move down on the last item', () => {
    renderCard({ index: 0, total: 2 });
    expect(screen.getByRole('button', { name: /move how we tested up/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move how we tested down/i })).toBeEnabled();
  });

  it('shows a title validation error', () => {
    renderCard({ titleError: 'Section title is required.' });
    expect(screen.getByText('Section title is required.')).toBeInTheDocument();
  });
});
