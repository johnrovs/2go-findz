import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TopPicksAndRunnerUpsStep from './TopPicksAndRunnerUpsStep.jsx';

const products = [
  { id: 1, name: 'Soundcore Liberty 4 NC', brand: 'Soundcore', productPrice: '69.99', imageFileName: null, rating: 4.8, reviewCount: 12850, active: true },
  { id: 2, name: 'TOZO NC9 Hybrid Active', brand: 'TOZO', productPrice: '39.99', imageFileName: null, rating: 4.2, reviewCount: 500, active: true },
];

describe('TopPicksAndRunnerUpsStep', () => {
  it('renders the heading, Top Pick section, and Runner-Ups section', () => {
    render(<TopPicksAndRunnerUpsStep recommendationSections={[]} onChange={vi.fn()} recommendedProducts={products} fieldErrors={{}} />);
    expect(screen.getByRole('heading', { name: 'Top Picks & Runner-Ups' })).toBeInTheDocument();
    expect(screen.getByText('No Top Pick selected')).toBeInTheDocument();
    expect(screen.getByText('No Runner-Ups added')).toBeInTheDocument();
  });

  it('toggles the How it works panel', async () => {
    const user = userEvent.setup();
    render(<TopPicksAndRunnerUpsStep recommendationSections={[]} onChange={vi.fn()} recommendedProducts={products} fieldErrors={{}} />);
    expect(screen.queryByText(/only one product can be the active top pick/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /how it works/i }));

    expect(screen.getByText(/only one product can be the active top pick/i)).toBeInTheDocument();
  });

  it('selecting a Top Pick product calls onChange with a new TOP_PICK entry', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TopPicksAndRunnerUpsStep recommendationSections={[]} onChange={onChange} recommendedProducts={products} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Add Top Pick Product' }));
    await user.click(screen.getAllByRole('button', { name: 'Select' })[0]);

    const next = onChange.mock.calls[0][0];
    expect(next).toHaveLength(1);
    expect(next[0].recommendationType).toBe('TOP_PICK');
    expect(next[0].product.id).toBe(1);
    expect(next[0].pros).toEqual([]);
  });

  it('the Runner-Up product picker excludes the current Top Pick', async () => {
    const topPickSection = {
      clientId: 'tp-1',
      product: products[0],
      recommendationType: 'TOP_PICK',
      sectionLabel: 'Best Overall',
      whyRecommended: '<p>Great.</p>',
      pros: [],
      cons: [],
      bestFor: [],
    };
    const user = userEvent.setup();
    render(<TopPicksAndRunnerUpsStep recommendationSections={[topPickSection]} onChange={vi.fn()} recommendedProducts={products} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Add Runner-Up Product' }));

    // "Soundcore Liberty 4 NC" is legitimately still shown elsewhere on the page (the
    // Top Pick section's own summary card), so scope this assertion to the picker dialog.
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.queryByText('Soundcore Liberty 4 NC')).not.toBeInTheDocument();
    expect(dialog.getByText('TOZO NC9 Hybrid Active')).toBeInTheDocument();
  });
});
