import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DeleteFaqDialog from './DeleteFaqDialog.jsx';

describe('DeleteFaqDialog', () => {
  it('is not visible when faq is null', () => {
    render(<DeleteFaqDialog faq={null} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows the FAQ question in the confirmation message', () => {
    render(
      <DeleteFaqDialog
        faq={{ clientId: 'f1', question: 'Is it worth it?', answer: 'Yes.' }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/"Is it worth it\?"/)).toBeInTheDocument();
  });

  it('falls back to "Untitled question" when the question is blank', () => {
    render(
      <DeleteFaqDialog faq={{ clientId: 'f1', question: '', answer: 'Yes.' }} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText(/"Untitled question"/)).toBeInTheDocument();
  });

  it('calls onConfirm when Delete FAQ is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <DeleteFaqDialog
        faq={{ clientId: 'f1', question: 'Is it worth it?', answer: 'Yes.' }}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete FAQ' }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <DeleteFaqDialog
        faq={{ clientId: 'f1', question: 'Is it worth it?', answer: 'Yes.' }}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
  });
});
