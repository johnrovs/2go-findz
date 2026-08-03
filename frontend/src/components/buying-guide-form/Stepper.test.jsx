import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Stepper from './Stepper.jsx';

describe('Stepper', () => {
  it('marks the active step as current and enabled', () => {
    render(<Stepper activeStep={1} maxUnlockedStep={1} onStepClick={vi.fn()} />);
    const basicInfoButton = screen.getByRole('button', { name: /Basic Info/ });
    expect(basicInfoButton).toBeEnabled();
    expect(basicInfoButton).toHaveAttribute('aria-current', 'step');
  });

  it('enables Products once unlocked, but keeps every step after it disabled', () => {
    render(<Stepper activeStep={2} maxUnlockedStep={2} onStepClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Products/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Quick Picks/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /SEO & Publish/ })).toBeDisabled();
  });

  it('enables Quick Picks once unlocked, but keeps every step after it disabled', () => {
    render(<Stepper activeStep={3} maxUnlockedStep={3} onStepClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Quick Picks/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Comparison/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /SEO & Publish/ })).toBeDisabled();
  });

  it('enables Comparison once unlocked, but keeps every step after it disabled', () => {
    render(<Stepper activeStep={4} maxUnlockedStep={4} onStepClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Comparison/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Top Picks & Runner-Ups/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /SEO & Publish/ })).toBeDisabled();
  });

  it('enables Top Picks & Runner-Ups once unlocked, but keeps every step after it disabled', () => {
    render(<Stepper activeStep={5} maxUnlockedStep={5} onStepClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Top Picks & Runner-Ups/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Buying Guide/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /SEO & Publish/ })).toBeDisabled();
  });

  it('keeps Products disabled while still locked', () => {
    render(<Stepper activeStep={1} maxUnlockedStep={1} onStepClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Products/ })).toBeDisabled();
  });

  it('calls onStepClick with the clicked, enabled step number', async () => {
    const onStepClick = vi.fn();
    const user = userEvent.setup();
    render(<Stepper activeStep={2} maxUnlockedStep={2} onStepClick={onStepClick} />);

    await user.click(screen.getByRole('button', { name: /Basic Info/ }));

    expect(onStepClick).toHaveBeenCalledWith(1);
  });
});
