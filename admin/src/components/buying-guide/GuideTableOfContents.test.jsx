import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GuideTableOfContents from './GuideTableOfContents.jsx';

const items = [
  { id: 'QUICK_RECOMMENDATIONS', number: 1, label: 'Quick Recommendations', anchorId: 'quick-recommendations' },
  { id: 'TOP_PICK', number: 2, label: 'Our Top Pick', anchorId: 'top-pick' },
];

describe('GuideTableOfContents', () => {
  it('renders numbered links for each item', () => {
    render(<GuideTableOfContents items={items} activeId={null} onNavigate={vi.fn()} />);

    expect(screen.getByRole('link', { name: /Quick Recommendations/ })).toHaveAttribute('href', '#quick-recommendations');
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('calls onNavigate with the clicked item instead of navigating', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<GuideTableOfContents items={items} activeId={null} onNavigate={onNavigate} />);

    await user.click(screen.getByRole('link', { name: /Our Top Pick/ }));

    expect(onNavigate).toHaveBeenCalledWith(items[1]);
  });

  it('marks the active item with aria-current', () => {
    render(<GuideTableOfContents items={items} activeId="TOP_PICK" onNavigate={vi.fn()} />);

    expect(screen.getByRole('link', { name: /Our Top Pick/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: /Quick Recommendations/ })).not.toHaveAttribute('aria-current');
  });

  it('toggles visibility via an accessible mobile control', async () => {
    const user = userEvent.setup();
    render(<GuideTableOfContents items={items} activeId={null} onNavigate={vi.fn()} />);

    const toggle = screen.getByRole('button', { name: 'Table of Contents' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders nothing when there are no items', () => {
    const { container } = render(<GuideTableOfContents items={[]} activeId={null} onNavigate={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
