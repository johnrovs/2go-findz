import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideContentStep from './BuyingGuideContentStep.jsx';

const structuralEntries = [
  { clientId: 'QUICK_RECOMMENDATIONS', sectionKey: 'QUICK_RECOMMENDATIONS', title: '', content: '', visible: true },
  { clientId: 'FAQS', sectionKey: 'FAQS', title: '', content: '', visible: true },
];

describe('BuyingGuideContentStep', () => {
  it('shows the empty state when there are no custom sections', () => {
    render(<BuyingGuideContentStep tocEntries={structuralEntries} onChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText('No buying guide sections yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Your First Section' })).toBeInTheDocument();
  });

  it('does not render structural entries as editable cards', () => {
    render(<BuyingGuideContentStep tocEntries={structuralEntries} onChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.queryByLabelText('Section title')).not.toBeInTheDocument();
  });

  it('renders one card per custom section, preserving structural entries untouched', () => {
    const tocEntries = [
      ...structuralEntries,
      { clientId: 'c1', sectionKey: null, title: 'How We Tested', content: '<p>Details.</p>', visible: true },
    ];
    render(<BuyingGuideContentStep tocEntries={tocEntries} onChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByDisplayValue('How We Tested')).toBeInTheDocument();
  });

  it('Add Section appends a new custom entry after the existing ones and auto-expands it', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<BuyingGuideContentStep tocEntries={structuralEntries} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Add Your First Section' }));

    expect(onChange).toHaveBeenCalledWith([
      ...structuralEntries,
      expect.objectContaining({ sectionKey: null, title: '', content: '', visible: true }),
    ]);
  });

  it('Add Section (header button) appends without disturbing structural entries', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const tocEntries = [...structuralEntries, { clientId: 'c1', sectionKey: null, title: 'Existing', content: '<p>x</p>', visible: true }];
    render(<BuyingGuideContentStep tocEntries={tocEntries} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Add Section' }));

    const nextEntries = onChange.mock.calls[0][0];
    expect(nextEntries).toHaveLength(4);
    expect(nextEntries[0]).toEqual(structuralEntries[0]);
    expect(nextEntries[1]).toEqual(structuralEntries[1]);
  });

  it('editing a section title updates only that entry, leaving structural entries untouched', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const tocEntries = [...structuralEntries, { clientId: 'c1', sectionKey: null, title: 'Draft', content: '<p>x</p>', visible: true }];
    render(<BuyingGuideContentStep tocEntries={tocEntries} onChange={onChange} fieldErrors={{}} />);

    await user.type(screen.getByDisplayValue('Draft'), '!');

    const lastCall = onChange.mock.calls.at(-1)[0];
    expect(lastCall[0]).toEqual(structuralEntries[0]);
    expect(lastCall[1]).toEqual(structuralEntries[1]);
    expect(lastCall[2].title).toBe('Draft!');
  });

  it('deletes an empty section immediately without a confirmation dialog', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const tocEntries = [...structuralEntries, { clientId: 'c1', sectionKey: null, title: 'Empty', content: '', visible: true }];
    render(<BuyingGuideContentStep tocEntries={tocEntries} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: /delete empty/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(structuralEntries);
  });

  it('deleting a section with content requires confirmation', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const tocEntries = [...structuralEntries, { clientId: 'c1', sectionKey: null, title: 'Full', content: '<p>Real content.</p>', visible: true }];
    render(<BuyingGuideContentStep tocEntries={tocEntries} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: /delete full/i }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete Section' }));
    expect(onChange).toHaveBeenCalledWith(structuralEntries);
  });

  it('Move down reorders custom entries relative to each other without moving structural entries', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const tocEntries = [
      structuralEntries[0],
      { clientId: 'c1', sectionKey: null, title: 'First', content: '<p>x</p>', visible: true },
      { clientId: 'c2', sectionKey: null, title: 'Second', content: '<p>y</p>', visible: true },
      structuralEntries[1],
    ];
    render(<BuyingGuideContentStep tocEntries={tocEntries} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: /move first down/i }));

    expect(onChange).toHaveBeenCalledWith([
      structuralEntries[0],
      tocEntries[2],
      tocEntries[1],
      structuralEntries[1],
    ]);
  });

  it('auto-expands the first section with a validation error', () => {
    // Uses a content error specifically, not a title error: the title error renders in the
    // always-visible collapsed header regardless of expand state, so it wouldn't actually
    // prove auto-expand works. The content error only renders inside RichTextEditor, which
    // only mounts when isExpanded is true -- so this genuinely exercises the auto-expand path.
    const tocEntries = [
      ...structuralEntries,
      { clientId: 'c1', sectionKey: null, title: 'Untitled', content: '', visible: true },
    ];
    render(
      <BuyingGuideContentStep tocEntries={tocEntries} onChange={vi.fn()} fieldErrors={{ 'content-c1': 'Section content is required.' }} />
    );
    expect(screen.getByText('Section content is required.')).toBeInTheDocument();
  });
});
