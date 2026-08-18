import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ActionsMenu from './ActionsMenu.jsx';

function renderMenu(props = {}) {
  return render(
    <MemoryRouter>
      <ActionsMenu editHref="/products/5" label="Wireless Earbuds" {...props} />
    </MemoryRouter>
  );
}

describe('ActionsMenu', () => {
  it('renders a closed menu by default with an accessible trigger', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: 'Wireless Earbuds actions' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the menu on click, showing only an Edit item', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: 'Wireless Earbuds actions' }));

    expect(screen.getByRole('menuitem', { name: /Edit/ })).toHaveAttribute('href', '/products/5');
  });

  it('closes on outside click', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <div>
          <ActionsMenu editHref="/products/5" label="Wireless Earbuds" />
          <button type="button">outside</button>
        </div>
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: 'Wireless Earbuds actions' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Wireless Earbuds actions' });
    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
