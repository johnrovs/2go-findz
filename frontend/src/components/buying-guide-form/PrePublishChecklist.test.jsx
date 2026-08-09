import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PrePublishChecklist from './PrePublishChecklist.jsx';

const items = [
  { id: 'basicInfo', label: 'Basic Info completed', isComplete: true, step: 1 },
  { id: 'seo', label: 'SEO title and description added', isComplete: false, step: 8 },
];

describe('PrePublishChecklist', () => {
  it('renders every item label', () => {
    render(<PrePublishChecklist items={items} onNavigate={vi.fn()} />);
    expect(screen.getByText('Basic Info completed')).toBeInTheDocument();
    expect(screen.getByText('SEO title and description added')).toBeInTheDocument();
  });

  it('calls onNavigate with the item\'s step when clicked', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<PrePublishChecklist items={items} onNavigate={onNavigate} />);

    await user.click(screen.getByText('SEO title and description added'));

    expect(onNavigate).toHaveBeenCalledWith(8);
  });
});
