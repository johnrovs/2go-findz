import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideContentSection from './BuyingGuideContentSection.jsx';

const sections = [
  { title: 'How We Tested', content: '<p>We tested for a week.</p>', anchorId: 'how-we-tested' },
  { title: 'What to Look For', content: '<p>Look for battery life.</p>', anchorId: 'what-to-look-for' },
];

describe('BuyingGuideContentSection', () => {
  it('renders the numbered heading and one card per section, numbered from 1', () => {
    render(<BuyingGuideContentSection sections={sections} number={5} guideId={3} onExpand={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /5\. Buying Guide/ })).toBeInTheDocument();
    expect(screen.getByText('How We Tested')).toBeInTheDocument();
    expect(screen.getByText('What to Look For')).toBeInTheDocument();
  });

  it('forwards onExpand from an individual card', async () => {
    const onExpand = vi.fn();
    const longContent = `<p>${'word '.repeat(50)}</p>`;
    const user = userEvent.setup();
    render(
      <BuyingGuideContentSection
        sections={[{ title: 'Long Section', content: longContent, anchorId: 'long-section' }]}
        number={5}
        guideId={3}
        onExpand={onExpand}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Read more' }));
    expect(onExpand).toHaveBeenCalledWith(expect.objectContaining({ guideId: 3, title: 'Long Section' }));
  });

  it('renders nothing when there are no custom sections', () => {
    const { container } = render(<BuyingGuideContentSection sections={[]} number={5} guideId={3} onExpand={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
