import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach } from 'vitest';
import { CompareProvider } from './CompareContext.jsx';
import { useCompare } from '../hooks/useCompare.js';

function TestConsumer() {
  const { ids, toggle, remove, clear, isSelected, isFull } = useCompare();
  return (
    <div>
      <p data-testid="ids">{ids.join(',')}</p>
      <p data-testid="isFull">{String(isFull)}</p>
      <p data-testid="isSelected1">{String(isSelected(1))}</p>
      <button onClick={() => toggle(1)}>Toggle 1</button>
      <button onClick={() => toggle(2)}>Toggle 2</button>
      <button onClick={() => toggle(3)}>Toggle 3</button>
      <button onClick={() => toggle(4)}>Toggle 4</button>
      <button onClick={() => toggle(5)}>Toggle 5</button>
      <button onClick={() => remove(2)}>Remove 2</button>
      <button onClick={() => clear()}>Clear</button>
    </div>
  );
}

function renderConsumer() {
  return render(
    <CompareProvider>
      <TestConsumer />
    </CompareProvider>
  );
}

describe('CompareContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty when localStorage has nothing stored', () => {
    renderConsumer();
    expect(screen.getByTestId('ids')).toHaveTextContent('');
  });

  it('adds an id when toggled on and removes it when toggled again', async () => {
    const user = userEvent.setup();
    renderConsumer();

    await user.click(screen.getByText('Toggle 1'));
    expect(screen.getByTestId('ids')).toHaveTextContent('1');
    expect(screen.getByTestId('isSelected1')).toHaveTextContent('true');

    await user.click(screen.getByText('Toggle 1'));
    expect(screen.getByTestId('ids')).toHaveTextContent('');
    expect(screen.getByTestId('isSelected1')).toHaveTextContent('false');
  });

  it('caps the selection at 4 items', async () => {
    const user = userEvent.setup();
    renderConsumer();

    await user.click(screen.getByText('Toggle 1'));
    await user.click(screen.getByText('Toggle 2'));
    await user.click(screen.getByText('Toggle 3'));
    await user.click(screen.getByText('Toggle 4'));
    expect(screen.getByTestId('isFull')).toHaveTextContent('true');

    await user.click(screen.getByText('Toggle 5'));
    expect(screen.getByTestId('ids')).toHaveTextContent('1,2,3,4');
  });

  it('removes a specific id via remove()', async () => {
    const user = userEvent.setup();
    renderConsumer();

    await user.click(screen.getByText('Toggle 1'));
    await user.click(screen.getByText('Toggle 2'));
    await user.click(screen.getByText('Remove 2'));

    expect(screen.getByTestId('ids')).toHaveTextContent('1');
  });

  it('clears the entire selection via clear()', async () => {
    const user = userEvent.setup();
    renderConsumer();

    await user.click(screen.getByText('Toggle 1'));
    await user.click(screen.getByText('Toggle 2'));
    await user.click(screen.getByText('Clear'));

    expect(screen.getByTestId('ids')).toHaveTextContent('');
  });

  it('persists the selection to localStorage and rehydrates a fresh provider from it', async () => {
    const user = userEvent.setup();
    const { unmount } = renderConsumer();

    await user.click(screen.getByText('Toggle 1'));
    await user.click(screen.getByText('Toggle 3'));
    unmount();

    renderConsumer();
    expect(screen.getByTestId('ids')).toHaveTextContent('1,3');
  });
});
