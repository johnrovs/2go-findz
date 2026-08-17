import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import PasswordField from './PasswordField.jsx';

describe('PasswordField', () => {
  it('defaults to a masked password input and reveals it on toggle', async () => {
    const user = userEvent.setup();
    render(<PasswordField id="password" label="Password" value="secret" onChange={() => {}} />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });

  it('shows an error message when error is set', () => {
    render(
      <PasswordField id="password" label="Password" value="" onChange={() => {}} error="Password is required." />
    );

    expect(screen.getByText('Password is required.')).toBeInTheDocument();
  });
});
