import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideFaqSection from './BuyingGuideFaqSection.jsx';

const faqs = [{ question: 'Is it worth it?', answer: 'Yes.' }];

describe('BuyingGuideFaqSection', () => {
  it('renders the numbered heading and the accordion', () => {
    render(<BuyingGuideFaqSection faqs={faqs} number={6} guideId={3} onExpand={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /6\. Frequently Asked Questions/ })).toBeInTheDocument();
    expect(screen.getByText('Is it worth it?')).toBeInTheDocument();
  });

  it('forwards onExpand with guide context', async () => {
    const onExpand = vi.fn();
    const user = userEvent.setup();
    render(<BuyingGuideFaqSection faqs={faqs} number={6} guideId={3} onExpand={onExpand} />);

    await user.click(screen.getByRole('button', { name: /Is it worth it\?/ }));

    expect(onExpand).toHaveBeenCalledWith(expect.objectContaining({ guideId: 3, question: 'Is it worth it?' }));
  });

  it('renders nothing when there are no FAQs', () => {
    const { container } = render(<BuyingGuideFaqSection faqs={[]} number={6} guideId={3} onExpand={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
