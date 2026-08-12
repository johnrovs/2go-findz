import { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Badge from './Badge.jsx';
import { SUPPORTED_LANGUAGES } from '../i18n/supportedLanguages.js';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function MobileMenu({ isOpen, onClose, compareCount = 0 }) {
  const { t, i18n } = useTranslation('common');
  const panelRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  const navItems = [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/trending', label: t('nav.trending') },
    { to: '/categories', label: t('nav.categories') },
    // Compare is hidden for now pending a future redesign — re-add
    // { to: '/compare', label: t('nav.compare') } here to restore it.
    { to: '/buying-guides', label: t('nav.buyingGuides') },
  ];

  useEffect(() => {
    if (!isOpen) return undefined;

    previouslyFocusedRef.current = document.activeElement;
    const panel = panelRef.current;
    const focusableElements = panel ? Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)) : [];
    focusableElements[0]?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t('nav.siteNavigationAriaLabel')}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        ref={panelRef}
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'tween', duration: 0.2 }}
        className="absolute inset-y-0 left-0 w-64 bg-white"
      >
        <nav aria-label={t('nav.siteNavigationAriaLabel')} className="flex h-full flex-col overflow-y-auto px-3 py-6">
          <ul className="flex-1 space-y-1">
            {navItems.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center rounded-md px-3 py-2 text-nav transition ${
                      isActive ? 'bg-primary/5 text-primary' : 'text-body hover:bg-slate-100'
                    }`
                  }
                >
                  {label}
                  {to === '/compare' && compareCount > 0 && <Badge>{compareCount}</Badge>}
                </NavLink>
              </li>
            ))}
            <li>
              <Link
                to="/products"
                onClick={onClose}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Search size={16} />
                {t('nav.searchButtonAriaLabel')}
              </Link>
            </li>
          </ul>

          <div className="mt-4 border-t border-border pt-4">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {t('nav.changeLanguageAriaLabel')}
            </p>
            <ul className="space-y-1">
              {SUPPORTED_LANGUAGES.map(({ code, nativeName }) => (
                <li key={code}>
                  <button
                    type="button"
                    onClick={() => i18n.changeLanguage(code)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-body hover:bg-slate-100"
                  >
                    {nativeName}
                    {i18n.language === code && <Check size={16} className="text-primary" aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </motion.div>
    </div>
  );
}

export default MobileMenu;
