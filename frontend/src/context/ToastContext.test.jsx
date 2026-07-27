import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from './ToastContext.jsx';
import { useToast } from '../hooks/useToast.js';

function TestTrigger() {
  const { showToast } = useToast();
  return <button onClick={() => showToast('Product saved successfully.', 'success')}>Trigger</button>;
}

describe('ToastContext', () => {
  it('shows a toast when showToast is called and it can be dismissed', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestTrigger />
      </ToastProvider>
    );

    await user.click(screen.getByText('Trigger'));
    expect(await screen.findByText('Product saved successfully.')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Dismiss notification'));
    await waitFor(() => expect(screen.queryByText('Product saved successfully.')).not.toBeInTheDocument());
  });
});
