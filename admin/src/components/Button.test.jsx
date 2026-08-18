import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Button from './Button.jsx';

describe('Button', () => {
  it('renders a native button by default', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('renders an anchor when given an href, forwarding target and rel', () => {
    render(
      <Button href="https://example.com" target="_blank" rel="noopener noreferrer">
        Go
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Go' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders a react-router Link when given a to prop', () => {
    render(
      <MemoryRouter>
        <Button to="/products/new">Add Product</Button>
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: 'Add Product' });
    expect(link).toHaveAttribute('href', '/products/new');
    expect(link).toHaveClass('bg-amazon', 'text-white');
  });

  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>);
    expect(screen.getByRole('button', { name: 'Primary' })).toHaveClass('bg-amazon', 'text-white');
  });

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button', { name: 'Secondary' })).toHaveClass('bg-white', 'text-heading', 'border-heading');
  });

  it('applies amazon variant classes', () => {
    render(<Button variant="amazon">Amazon</Button>);
    expect(screen.getByRole('button', { name: 'Amazon' })).toHaveClass('bg-amazon', 'text-white');
  });

  it('applies danger variant classes', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-danger', 'text-white');
  });

  it('renders the accent variant with the dashboard-orange background', () => {
    render(<Button variant="accent">Add Product</Button>);
    expect(screen.getByRole('button', { name: 'Add Product' })).toHaveClass('bg-dashboard-orange');
  });

  it('forwards onClick and disabled to a native button', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Disabled
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Disabled' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('forwards type to a native button', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'submit');
  });

  it('merges a passed className with the variant/size classes', () => {
    render(<Button className="w-full">Full width</Button>);
    expect(screen.getByRole('button', { name: 'Full width' })).toHaveClass('w-full', 'bg-amazon');
  });

  it('applies outline variant classes', () => {
    render(<Button variant="outline">Import Products</Button>);
    expect(screen.getByRole('button', { name: 'Import Products' })).toHaveClass(
      'bg-white', 'text-primary', 'border-primary'
    );
  });
});
