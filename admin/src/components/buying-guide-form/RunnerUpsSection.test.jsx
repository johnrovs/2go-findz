import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RunnerUpsSection from './RunnerUpsSection.jsx';

const product = (id, name) => ({ id, name, brand: 'Brand', productPrice: '19.99', imageFileName: null, rating: 4, reviewCount: 10, active: true });

function buildRunnerUp(id, name) {
  return {
    clientId: `ru-${id}`,
    product: product(id, name),
    sectionLabel: `Runner-Up ${id}`,
    whyRecommended: '<p>Good.</p>',
    pros: [{ clientId: 'p', content: 'Good' }],
    cons: [{ clientId: 'c', content: 'Meh' }],
    bestFor: [{ clientId: 'b', content: 'Everyone' }],
  };
}

describe('RunnerUpsSection', () => {
  it('shows the empty state and an Add button when there are no Runner-Ups', () => {
    render(<RunnerUpsSection runnerUps={[]} eligibleProducts={[product(1, 'A')]} onAdd={vi.fn()} onChangeProductRequest={vi.fn()} onRemove={vi.fn()} onFieldChange={vi.fn()} onReorder={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText('No Runner-Ups added')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Runner-Up Product' })).toBeInTheDocument();
  });

  it('shows the current count and configured maximum', () => {
    render(<RunnerUpsSection runnerUps={[buildRunnerUp(1, 'A')]} eligibleProducts={[]} onAdd={vi.fn()} onChangeProductRequest={vi.fn()} onRemove={vi.fn()} onFieldChange={vi.fn()} onReorder={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText('1 / 4 Runner-Ups')).toBeInTheDocument();
  });

  it('disables Add Runner-Up Product at the maximum', () => {
    const runnerUps = [1, 2, 3, 4].map((id) => buildRunnerUp(id, `Product ${id}`));
    render(<RunnerUpsSection runnerUps={runnerUps} eligibleProducts={[]} onAdd={vi.fn()} onChangeProductRequest={vi.fn()} onRemove={vi.fn()} onFieldChange={vi.fn()} onReorder={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByRole('button', { name: 'Add Runner-Up Product' })).toBeDisabled();
    expect(screen.getByText(/maximum of 4 runner-ups/i)).toBeInTheDocument();
  });

  it('adding a product calls onAdd', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<RunnerUpsSection runnerUps={[]} eligibleProducts={[product(1, 'Eligible Product')]} onAdd={onAdd} onChangeProductRequest={vi.fn()} onRemove={vi.fn()} onFieldChange={vi.fn()} onReorder={vi.fn()} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Add Runner-Up Product' }));
    await user.click(screen.getByRole('button', { name: 'Select' }));

    expect(onAdd).toHaveBeenCalledWith(product(1, 'Eligible Product'));
  });

  it('renders one card per Runner-Up', () => {
    render(<RunnerUpsSection runnerUps={[buildRunnerUp(1, 'First'), buildRunnerUp(2, 'Second')]} eligibleProducts={[]} onAdd={vi.fn()} onChangeProductRequest={vi.fn()} onRemove={vi.fn()} onFieldChange={vi.fn()} onReorder={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
