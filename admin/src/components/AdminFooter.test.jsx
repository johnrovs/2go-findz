import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdminFooter from './AdminFooter.jsx';

describe('AdminFooter', () => {
  it('renders the copyright text with the current year', () => {
    render(<AdminFooter />);
    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year} 2Go Findz. All rights reserved.`)).toBeInTheDocument();
  });
});
