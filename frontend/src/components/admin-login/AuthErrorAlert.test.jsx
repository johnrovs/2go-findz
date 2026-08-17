import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AuthErrorAlert from './AuthErrorAlert.jsx';

describe('AuthErrorAlert', () => {
  it('renders nothing when there is no message', () => {
    const { container } = render(<AuthErrorAlert message="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the message inside an alert role when set', () => {
    render(<AuthErrorAlert message="Invalid email address or password." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email address or password.');
  });
});
