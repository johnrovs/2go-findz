import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from 'i18next';
import LanguageSelector from './LanguageSelector.jsx';

afterEach(async () => {
  await i18n.changeLanguage('en-US');
});

describe('LanguageSelector', () => {
  it('renders a closed menu by default with a globe trigger button', () => {
    render(<LanguageSelector />);
    expect(screen.getByRole('button', { name: 'Change language' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the menu on click, listing all 5 supported languages by native name', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: 'Change language' }));

    const menu = screen.getByRole('menu');
    expect(within(menu).getByText('English')).toBeInTheDocument();
    expect(within(menu).getByText('Español')).toBeInTheDocument();
    expect(within(menu).getByText('Filipino')).toBeInTheDocument();
    expect(within(menu).getByText('简体中文')).toBeInTheDocument();
    expect(within(menu).getByText('Tiếng Việt')).toBeInTheDocument();
  });

  it('shows a checkmark next to the currently active language only', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: 'Change language' }));

    const englishItem = screen.getByRole('menuitem', { name: /English/ });
    const spanishItem = screen.getByRole('menuitem', { name: /Español/ });
    expect(englishItem.querySelector('svg')).toBeInTheDocument();
    expect(spanishItem.querySelector('svg')).not.toBeInTheDocument();
  });

  it('changes the active language and closes the menu when an item is selected', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: 'Change language' }));
    await user.click(screen.getByRole('menuitem', { name: /Español/ }));

    await waitFor(() => expect(i18n.language).toBe('es-US'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes the menu on outside click', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <LanguageSelector />
        <button type="button">outside</button>
      </div>
    );
    await user.click(screen.getByRole('button', { name: 'Change language' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes the menu on Escape and returns focus to the trigger button', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    const trigger = screen.getByRole('button', { name: 'Change language' });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
