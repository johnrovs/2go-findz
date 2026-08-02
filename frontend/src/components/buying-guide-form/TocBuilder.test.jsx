import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TocBuilder from './TocBuilder.jsx';

const structuralEntries = [
  { clientId: 'QUICK_RECOMMENDATIONS', sectionKey: 'QUICK_RECOMMENDATIONS', title: '', content: '', visible: true },
  { clientId: 'FAQS', sectionKey: 'FAQS', title: '', content: '', visible: true },
];

describe('TocBuilder', () => {
  it('renders structural rows with derived labels and no delete button', () => {
    render(<TocBuilder tocEntries={structuralEntries} onChange={vi.fn()} />);
    expect(screen.getByText('Quick Recommendations')).toBeInTheDocument();
    expect(screen.getByText('FAQs')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Quick Recommendations' })).not.toBeInTheDocument();
  });

  it('adds a blank custom section', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TocBuilder tocEntries={structuralEntries} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Add Section' }));

    expect(onChange).toHaveBeenCalledWith([
      ...structuralEntries,
      expect.objectContaining({ sectionKey: null, title: '', content: '', visible: true }),
    ]);
  });

  it('edits a custom section title inline', async () => {
    const customEntries = [{ clientId: 'custom-1', sectionKey: null, title: '', content: '', visible: true }];
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TocBuilder tocEntries={customEntries} onChange={onChange} />);

    await user.type(screen.getByLabelText('Section title'), 'X');

    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ clientId: 'custom-1', title: 'X' })]);
  });

  it('deletes a custom section immediately when its content is blank', async () => {
    const customEntries = [{ clientId: 'custom-1', sectionKey: null, title: 'Empty', content: '', visible: true }];
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TocBuilder tocEntries={customEntries} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Remove Empty' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('confirms before deleting a custom section that has content', async () => {
    const customEntries = [
      { clientId: 'custom-1', sectionKey: null, title: 'Warranty Info', content: 'Details here.', visible: true },
    ];
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TocBuilder tocEntries={customEntries} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Remove Warranty Info' }));
    expect(screen.getByText(/permanently delete it/)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('toggles visibility', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TocBuilder tocEntries={structuralEntries} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Hide Quick Recommendations' }));

    expect(onChange).toHaveBeenCalledWith([{ ...structuralEntries[0], visible: false }, structuralEntries[1]]);
  });

  it('reorders rows with the up/down buttons', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TocBuilder tocEntries={structuralEntries} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Move FAQs up' }));

    expect(onChange).toHaveBeenCalledWith([structuralEntries[1], structuralEntries[0]]);
  });
});
