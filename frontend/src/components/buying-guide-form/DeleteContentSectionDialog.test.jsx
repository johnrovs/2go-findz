import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DeleteContentSectionDialog from './DeleteContentSectionDialog.jsx';

describe('DeleteContentSectionDialog', () => {
  it('is not visible when section is null', () => {
    render(<DeleteContentSectionDialog section={null} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows the section title in the confirmation message', () => {
    render(
      <DeleteContentSectionDialog
        section={{ clientId: 'c1', title: 'How We Tested', content: '<p>Text</p>' }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/"How We Tested"/)).toBeInTheDocument();
  });

  it('falls back to "Untitled Section" when the title is blank', () => {
    render(
      <DeleteContentSectionDialog section={{ clientId: 'c1', title: '', content: '<p>Text</p>' }} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText(/"Untitled Section"/)).toBeInTheDocument();
  });

  it('calls onConfirm when Delete Section is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <DeleteContentSectionDialog
        section={{ clientId: 'c1', title: 'How We Tested', content: '<p>Text</p>' }}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete Section' }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <DeleteContentSectionDialog
        section={{ clientId: 'c1', title: 'How We Tested', content: '<p>Text</p>' }}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
  });
});
