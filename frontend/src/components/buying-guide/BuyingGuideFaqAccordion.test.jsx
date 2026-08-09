import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideFaqAccordion from './BuyingGuideFaqAccordion.jsx';

const sixFaqs = Array.from({ length: 6 }, (_, i) => ({
  question: `Question ${i + 1}?`,
  answer: `Answer ${i + 1}.`,
}));

describe('BuyingGuideFaqAccordion', () => {
  it('shows only the first 5 questions with a "View all" toggle', () => {
    render(<BuyingGuideFaqAccordion faqs={sixFaqs} />);

    expect(screen.getByText('Question 1?')).toBeInTheDocument();
    expect(screen.queryByText('Question 6?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View all 6 questions' })).toBeInTheDocument();
  });

  it('reveals the rest when "View all" is clicked and relabels itself', async () => {
    const user = userEvent.setup();
    render(<BuyingGuideFaqAccordion faqs={sixFaqs} />);

    await user.click(screen.getByRole('button', { name: 'View all 6 questions' }));

    expect(screen.getByText('Question 6?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show fewer questions' })).toBeInTheDocument();
  });

  it('does not render a toggle when there are 5 or fewer FAQs', () => {
    render(<BuyingGuideFaqAccordion faqs={sixFaqs.slice(0, 5)} />);
    expect(screen.queryByText(/View all/)).not.toBeInTheDocument();
  });

  it('expands an answer independently via a real button with correct aria-expanded', async () => {
    const user = userEvent.setup();
    render(<BuyingGuideFaqAccordion faqs={sixFaqs} />);

    const firstButton = screen.getByRole('button', { name: /Question 1\?/ });
    expect(firstButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Answer 1.')).not.toBeInTheDocument();

    await user.click(firstButton);

    expect(firstButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Answer 1.')).toBeInTheDocument();
    expect(screen.queryByText('Answer 2.')).not.toBeInTheDocument();
  });

  it('calls onExpand only when opening, not when closing', async () => {
    const onExpand = vi.fn();
    const user = userEvent.setup();
    render(<BuyingGuideFaqAccordion faqs={sixFaqs} onExpand={onExpand} />);

    const firstButton = screen.getByRole('button', { name: /Question 1\?/ });
    await user.click(firstButton);
    expect(onExpand).toHaveBeenCalledTimes(1);
    expect(onExpand).toHaveBeenCalledWith('Question 1?');

    await user.click(firstButton);
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard activation', async () => {
    const user = userEvent.setup();
    render(<BuyingGuideFaqAccordion faqs={sixFaqs} />);

    await user.tab();
    expect(screen.getByRole('button', { name: /Question 1\?/ })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Answer 1.')).toBeInTheDocument();
  });
});
