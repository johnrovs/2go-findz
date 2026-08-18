import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideContentCard from './BuyingGuideContentCard.jsx';

describe('BuyingGuideContentCard', () => {
  it('renders the numbered heading, anchor id, and content', () => {
    render(
      <BuyingGuideContentCard title="How We Tested" content="<p>Short body.</p>" anchorId="how-we-tested" number={1} />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('How We Tested')).toBeInTheDocument();
    const card = screen.getByText('How We Tested').closest('[id]');
    expect(card).toHaveAttribute('id', 'how-we-tested');
  });

  it('does not show a Read more toggle for short content', () => {
    render(<BuyingGuideContentCard title="Short" content="<p>Short body.</p>" anchorId="short" number={1} />);
    expect(screen.queryByText('Read more')).not.toBeInTheDocument();
  });

  it('shows a Read more toggle for long content and expands on click', async () => {
    const longContent = `<p>${'word '.repeat(50)}</p>`;
    const user = userEvent.setup();
    render(<BuyingGuideContentCard title="Long Section" content={longContent} anchorId="long-section" number={1} />);

    const toggle = screen.getByRole('button', { name: 'Read more' });
    await user.click(toggle);

    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument();
  });

  it('calls onExpand only when expanding', async () => {
    const onExpand = vi.fn();
    const longContent = `<p>${'word '.repeat(50)}</p>`;
    const user = userEvent.setup();
    render(<BuyingGuideContentCard title="Long Section" content={longContent} anchorId="long-section" number={1} onExpand={onExpand} />);

    const toggle = screen.getByRole('button', { name: 'Read more' });
    await user.click(toggle);
    expect(onExpand).toHaveBeenCalledWith('Long Section');

    await user.click(screen.getByRole('button', { name: 'Show less' }));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });
});
