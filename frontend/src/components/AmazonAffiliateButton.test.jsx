import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AmazonAffiliateButton from './AmazonAffiliateButton.jsx';

describe('AmazonAffiliateButton', () => {
  it('renders a real Amazon link with safe attributes when the URL is valid', () => {
    render(<AmazonAffiliateButton productName="Wireless Earbuds" url="https://amazon.com/dp/B00TEST" />);

    const link = screen.getByRole('link', { name: 'View Wireless Earbuds on Amazon' });
    expect(link).toHaveAttribute('href', 'https://amazon.com/dp/B00TEST');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');
  });

  it('renders a disabled state instead of a link when the URL is invalid', () => {
    render(<AmazonAffiliateButton productName="Wireless Earbuds" url="https://example.com/not-amazon" />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Link unavailable')).toBeInTheDocument();
  });

  it('renders a disabled state when the URL is missing', () => {
    render(<AmazonAffiliateButton productName="Wireless Earbuds" url={null} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Link unavailable')).toBeInTheDocument();
  });

  it('calls onClick when the valid link is clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<AmazonAffiliateButton productName="Wireless Earbuds" url="https://amazon.com/dp/B00TEST" onClick={onClick} />);

    await user.click(screen.getByRole('link', { name: /View Wireless Earbuds on Amazon/ }));

    expect(onClick).toHaveBeenCalled();
  });

  it('accepts custom children as the link label', () => {
    render(
      <AmazonAffiliateButton productName="Wireless Earbuds" url="https://amazon.com/dp/B00TEST">
        View Wireless Earbuds on Amazon $49.99
      </AmazonAffiliateButton>
    );

    expect(screen.getByText('View Wireless Earbuds on Amazon $49.99')).toBeInTheDocument();
  });
});
