import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CategoryCard from './CategoryCard.jsx';

describe('CategoryCard', () => {
  it('renders the category name', () => {
    render(<CategoryCard category={{ id: 1, productCategoryName: 'Electronics' }} onClick={vi.fn()} />);
    expect(screen.getByText('Electronics')).toBeInTheDocument();
  });

  it('calls onClick with the category id when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<CategoryCard category={{ id: 7, productCategoryName: 'Home & Kitchen' }} onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: 'Home & Kitchen' }));

    expect(onClick).toHaveBeenCalledWith(7);
  });
});
