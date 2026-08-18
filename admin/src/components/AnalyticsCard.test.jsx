import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Eye } from 'lucide-react';
import AnalyticsCard from './AnalyticsCard.jsx';

describe('AnalyticsCard', () => {
  it('renders the label and value', () => {
    render(<AnalyticsCard label="Total Views" value="1,204" />);
    expect(screen.getByText('Total Views')).toBeInTheDocument();
    expect(screen.getByText('1,204')).toBeInTheDocument();
  });

  it('renders an icon when provided', () => {
    render(<AnalyticsCard label="Total Views" value="1,204" icon={Eye} />);
    expect(document.querySelector('svg')).toBeInTheDocument();
  });
});
