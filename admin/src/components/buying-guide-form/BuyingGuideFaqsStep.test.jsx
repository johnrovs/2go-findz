import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideFaqsStep from './BuyingGuideFaqsStep.jsx';

function StatefulFaqsStep({ initialFaqs }) {
  const [faqs, setFaqs] = useState(initialFaqs);
  return <BuyingGuideFaqsStep faqs={faqs} onChange={setFaqs} fieldErrors={{}} />;
}

describe('BuyingGuideFaqsStep', () => {
  it('shows the empty state when there are no FAQs', () => {
    render(<BuyingGuideFaqsStep faqs={[]} onChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText('No FAQs added yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Your First FAQ' })).toBeInTheDocument();
  });

  it('renders one row per FAQ with the count in the card heading', () => {
    const faqs = [
      { clientId: 'f1', question: 'Is it worth it?', answer: 'Yes.' },
      { clientId: 'f2', question: 'How long does it last?', answer: 'A long time.' },
    ];
    render(<BuyingGuideFaqsStep faqs={faqs} onChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText('Frequently Asked Questions (2)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Is it worth it?')).toBeInTheDocument();
    expect(screen.getByDisplayValue('How long does it last?')).toBeInTheDocument();
  });

  it('Add Your First FAQ appends a new blank FAQ and auto-expands it', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<BuyingGuideFaqsStep faqs={[]} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Add Your First FAQ' }));

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ question: '', answer: '' })]);
  });

  it('Add FAQ (header button) appends without disturbing existing FAQs', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const faqs = [{ clientId: 'f1', question: 'Existing?', answer: 'Yes.' }];
    render(<BuyingGuideFaqsStep faqs={faqs} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Add FAQ' }));

    const nextFaqs = onChange.mock.calls[0][0];
    expect(nextFaqs).toHaveLength(2);
    expect(nextFaqs[0]).toEqual(faqs[0]);
  });

  it('focuses the new Question input when Add Your First FAQ is clicked', async () => {
    const user = userEvent.setup();
    render(<StatefulFaqsStep initialFaqs={[]} />);

    await user.click(screen.getByRole('button', { name: 'Add Your First FAQ' }));

    expect(screen.getByRole('textbox', { name: 'Question' })).toHaveFocus();
  });

  it('focuses the new Question input when Add FAQ is clicked with existing FAQs', async () => {
    const user = userEvent.setup();
    render(<StatefulFaqsStep initialFaqs={[{ clientId: 'f1', question: 'Existing?', answer: 'Yes.' }]} />);

    await user.click(screen.getByRole('button', { name: 'Add FAQ' }));

    const questionInputs = screen.getAllByRole('textbox', { name: 'Question' });
    expect(questionInputs[1]).toHaveFocus();
  });

  it('disables Add FAQ once the maximum of 20 is reached', () => {
    const faqs = Array.from({ length: 20 }, (_, i) => ({ clientId: `f${i}`, question: `Q${i}?`, answer: `A${i}.` }));
    render(<BuyingGuideFaqsStep faqs={faqs} onChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByRole('button', { name: 'Add FAQ' })).toBeDisabled();
    expect(screen.getByText(/maximum of 20/i)).toBeInTheDocument();
  });

  it('editing a question updates only that FAQ', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const faqs = [
      { clientId: 'f1', question: 'Draft', answer: 'A.' },
      { clientId: 'f2', question: 'Other', answer: 'B.' },
    ];
    render(<BuyingGuideFaqsStep faqs={faqs} onChange={onChange} fieldErrors={{}} />);

    await user.type(screen.getByDisplayValue('Draft'), '!');

    const lastCall = onChange.mock.calls.at(-1)[0];
    expect(lastCall[0].question).toBe('Draft!');
    expect(lastCall[1]).toEqual(faqs[1]);
  });

  it('deletes an empty FAQ immediately without a confirmation dialog', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const faqs = [{ clientId: 'f1', question: '', answer: '' }];
    render(<BuyingGuideFaqsStep faqs={faqs} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: /delete untitled question/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('deleting a FAQ with content requires confirmation', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const faqs = [{ clientId: 'f1', question: 'Is it worth it?', answer: 'Yes.' }];
    render(<BuyingGuideFaqsStep faqs={faqs} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: /delete is it worth it/i }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete FAQ' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('Move down reorders FAQs', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const faqs = [
      { clientId: 'f1', question: 'First?', answer: 'A.' },
      { clientId: 'f2', question: 'Second?', answer: 'B.' },
    ];
    render(<BuyingGuideFaqsStep faqs={faqs} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: /move first\? down/i }));

    expect(onChange).toHaveBeenCalledWith([faqs[1], faqs[0]]);
  });

  it('auto-expands the first FAQ with a validation error', () => {
    // Uses an answer error specifically, not a question error: the question error renders in
    // the always-visible collapsed header regardless of expand state, so it wouldn't actually
    // prove auto-expand works -- mirrors the same reasoning applied in BuyingGuideContentStep.
    const faqs = [{ clientId: 'f1', question: 'Untitled', answer: '' }];
    render(
      <BuyingGuideFaqsStep faqs={faqs} onChange={vi.fn()} fieldErrors={{ 'answer-f1': 'Answer is required.' }} />
    );
    expect(screen.getByText('Answer is required.')).toBeInTheDocument();
  });

  it('shows a structured data preview that updates with FAQ content', async () => {
    const user = userEvent.setup();
    const faqs = [{ clientId: 'f1', question: 'Is it worth it?', answer: 'Yes.' }];
    render(<BuyingGuideFaqsStep faqs={faqs} onChange={vi.fn()} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: /structured data preview/i }));

    expect(screen.getByText(/"@type": "FAQPage"/)).toBeInTheDocument();
    expect(screen.getByText(/"Is it worth it\?"/)).toBeInTheDocument();
  });
});
