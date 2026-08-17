import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Mail } from 'lucide-react';
import FormField from './FormField.jsx';

describe('FormField', () => {
  it('links the label to the input and forwards typed input to onChange', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<FormField id="email" label="Email address" icon={Mail} value="" onChange={handleChange} />);

    const input = screen.getByLabelText('Email address');
    await user.type(input, 'a');

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('shows an error message and marks the input invalid when error is set', () => {
    render(
      <FormField id="email" label="Email address" value="" onChange={() => {}} error="Email address is required." />
    );

    const input = screen.getByLabelText('Email address');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-error');
    expect(screen.getByText('Email address is required.')).toBeInTheDocument();
  });

  it('does not mark the input invalid when there is no error', () => {
    render(<FormField id="email" label="Email address" value="" onChange={() => {}} />);

    expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'false');
  });
});
