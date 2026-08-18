import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GaugeCard from './GaugeCard.jsx';

describe('GaugeCard', () => {
  it('renders the label', () => {
    render(<GaugeCard label="Click-Through Rate" value={30} />);
    expect(screen.getByText('Click-Through Rate')).toBeInTheDocument();
  });

  it('renders the value as a percentage', () => {
    render(<GaugeCard label="Click-Through Rate" value={30} />);
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('renders 0% when given a value of 0', () => {
    render(<GaugeCard label="Best-Seller Share" value={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
