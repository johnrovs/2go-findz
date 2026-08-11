import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import ProductFilterSidebar from './ProductFilterSidebar.jsx';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function MobileFilterDrawer({ isOpen, onClose, ...sidebarProps }) {
  const panelRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

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
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        data-testid="mobile-filter-drawer-backdrop"
      />
      <motion.div
        ref={panelRef}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'tween', duration: 0.2 }}
        className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-white p-4"
      >
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="rounded-md p-1.5 text-muted hover:bg-slate-100"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <ProductFilterSidebar {...sidebarProps} />
      </motion.div>
    </div>
  );
}

export default MobileFilterDrawer;
