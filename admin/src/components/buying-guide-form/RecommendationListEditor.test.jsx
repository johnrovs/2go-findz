import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RecommendationListEditor from './RecommendationListEditor.jsx';

const items = [
  { clientId: 'a', content: 'Great sound' },
  { clientId: 'b', content: 'Long battery life' },
];

describe('RecommendationListEditor', () => {
  it('renders the title, items, and Add button label', () => {
    render(<RecommendationListEditor title="Pros" items={items} addLabel="Pro" onChange={vi.fn()} error={null} />);
    expect(screen.getByRole('heading', { name: 'Pros' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Great sound')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Long battery life')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add Pro' })).toBeInTheDocument();
  });

  it('adds a new blank item when Add is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RecommendationListEditor title="Pros" items={items} addLabel="Pro" onChange={onChange} error={null} />);

    await user.click(screen.getByRole('button', { name: '+ Add Pro' }));

    const next = onChange.mock.calls[0][0];
    expect(next).toHaveLength(3);
    expect(next[2].content).toBe('');
  });

  it('calls onChange when an item is edited', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RecommendationListEditor title="Pros" items={items} addLabel="Pro" onChange={onChange} error={null} />);

    await user.type(screen.getByDisplayValue('Great sound'), '!');

    expect(onChange).toHaveBeenCalledWith([
      { clientId: 'a', content: 'Great sound!' },
      { clientId: 'b', content: 'Long battery life' },
    ]);
  });

  it('removes an item when its delete button is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RecommendationListEditor title="Pros" items={items} addLabel="Pro" onChange={onChange} error={null} />);

    await user.click(screen.getByRole('button', { name: 'Delete "Great sound"' }));

    expect(onChange).toHaveBeenCalledWith([{ clientId: 'b', content: 'Long battery life' }]);
  });

  it('moves an item up and down', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RecommendationListEditor title="Pros" items={items} addLabel="Pro" onChange={onChange} error={null} />);

    await user.click(screen.getByRole('button', { name: 'Move "Long battery life" up' }));

    expect(onChange).toHaveBeenCalledWith([
      { clientId: 'b', content: 'Long battery life' },
      { clientId: 'a', content: 'Great sound' },
    ]);
  });

  it('shows an inline error when provided', () => {
    render(<RecommendationListEditor title="Pros" items={[]} addLabel="Pro" onChange={vi.fn()} error="Add at least one pro." />);
    expect(screen.getByText('Add at least one pro.')).toBeInTheDocument();
  });
});
