import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AdminLoginCard from './AdminLoginCard.jsx';

function renderCard(overrides = {}) {
  const props = {
    username: '',
    onUsernameChange: vi.fn(),
    password: '',
    onPasswordChange: vi.fn(),
    usernameError: undefined,
    passwordError: undefined,
    formError: '',
    isSubmitting: false,
    onSubmit: vi.fn((event) => event.preventDefault()),
    ...overrides,
  };
  render(<AdminLoginCard {...props} />);
  return props;
}

describe('AdminLoginCard', () => {
  it('renders the heading, both fields, and the Sign In button', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls onSubmit when the form is submitted', async () => {
    const user = userEvent.setup();
    const props = renderCard();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows the loading label and disables the button while submitting', () => {
    renderCard({ isSubmitting: true });

    const button = screen.getByRole('button', { name: /signing in/i });
    expect(button).toBeDisabled();
  });

  it('renders field and form errors passed down as props', () => {
    renderCard({ usernameError: 'Email address is required.', formError: 'Invalid email address or password.' });

    expect(screen.getByText('Email address is required.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email address or password.');
  });
});
