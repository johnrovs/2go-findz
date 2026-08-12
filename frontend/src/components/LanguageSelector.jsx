import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n/supportedLanguages.js';

function LanguageSelector() {
  const { t, i18n } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function selectLanguage(code) {
    i18n.changeLanguage(code);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t('nav.changeLanguageAriaLabel')}
        className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <Globe size={18} aria-hidden="true" />
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label={t('nav.changeLanguageAriaLabel')}
          className="absolute right-0 top-full mt-2 w-44 rounded-card border border-slate-200 bg-white py-2 shadow-dropdown"
        >
          {SUPPORTED_LANGUAGES.map(({ code, nativeName }) => (
            <button
              key={code}
              type="button"
              role="menuitem"
              onClick={() => selectLanguage(code)}
              className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {nativeName}
              {i18n.language === code && <Check size={16} className="text-primary" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSelector;
