import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Badge from './Badge.jsx';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>3</Badge>);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('applies pill and primary-color classes', () => {
    render(<Badge>3</Badge>);
    expect(screen.getByText('3')).toHaveClass('rounded-full', 'bg-primary', 'text-white');
  });
});
