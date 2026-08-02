import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import QuickPickBadge from './QuickPickBadge.jsx';

describe('QuickPickBadge', () => {
  it('renders the label text', () => {
    render(<QuickPickBadge label="Best Overall" index={0} />);
    expect(screen.getByText('Best Overall')).toBeInTheDocument();
  });

  it('assigns different background classes for different indexes', () => {
    const { container: c0 } = render(<QuickPickBadge label="A" index={0} />);
    const { container: c1 } = render(<QuickPickBadge label="B" index={1} />);
    expect(c0.firstChild.className).not.toEqual(c1.firstChild.className);
  });

  it('cycles color after 5 items', () => {
    const { container: c0 } = render(<QuickPickBadge label="A" index={0} />);
    const { container: c5 } = render(<QuickPickBadge label="F" index={5} />);
    expect(c0.firstChild.className).toEqual(c5.firstChild.className);
  });
});
