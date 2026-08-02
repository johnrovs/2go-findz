import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Stepper from './Stepper.jsx';

describe('Stepper', () => {
  it('marks Basic Info as the active, enabled step', () => {
    render(<Stepper />);
    const basicInfoButton = screen.getByRole('button', { name: /Basic Info/ });
    expect(basicInfoButton).toBeEnabled();
    expect(basicInfoButton).toHaveAttribute('aria-current', 'step');
  });

  it('disables every step after Basic Info', () => {
    render(<Stepper />);
    expect(screen.getByRole('button', { name: /Products/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /SEO & Publish/ })).toBeDisabled();
  });
});
