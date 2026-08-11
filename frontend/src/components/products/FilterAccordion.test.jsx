import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import FilterAccordion from './FilterAccordion.jsx';

describe('FilterAccordion', () => {
  it('renders collapsed by default and expands the panel on click', async () => {
    const user = userEvent.setup();
    render(
      <FilterAccordion title="Brand">
        <p>Brand options</p>
      </FilterAccordion>
    );

    const toggle = screen.getByRole('button', { name: 'Brand' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Brand options')).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Brand options')).toBeInTheDocument();
  });

  it('supports defaultOpen to render expanded initially', () => {
    render(
      <FilterAccordion title="Category" defaultOpen>
        <p>Category options</p>
      </FilterAccordion>
    );

    expect(screen.getByRole('button', { name: 'Category' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Category options')).toBeInTheDocument();
  });

  it('collapses again on a second click', async () => {
    const user = userEvent.setup();
    render(
      <FilterAccordion title="Brand" defaultOpen>
        <p>Brand options</p>
      </FilterAccordion>
    );

    await user.click(screen.getByRole('button', { name: 'Brand' }));

    expect(screen.getByRole('button', { name: 'Brand' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Brand options')).not.toBeInTheDocument();
  });
});
