import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import NewsletterForm from './NewsletterForm.jsx';

describe('NewsletterForm', () => {
  it('renders a real email input and subscribe button', () => {
    render(<NewsletterForm />);
    expect(screen.getByLabelText('Subscribe to our newsletter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeInTheDocument();
  });

  it('shows an honest unavailable message on submit instead of a silent no-op or fake success', async () => {
    const user = userEvent.setup();
    render(<NewsletterForm />);

    await user.type(screen.getByLabelText('Subscribe to our newsletter'), 'shopper@example.com');
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));

    expect(await screen.findByText(/newsletter signup isn't available yet/i)).toBeInTheDocument();
  });

  it('marks the email input as required', () => {
    render(<NewsletterForm />);
    expect(screen.getByLabelText('Subscribe to our newsletter')).toBeRequired();
  });
});
