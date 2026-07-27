import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function Modal({ isOpen, onClose, title, children, role = 'dialog' }) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    const dialogNode = dialogRef.current;
    const firstFocusable = dialogNode.querySelector(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const elements = dialogNode.querySelectorAll(FOCUSABLE_SELECTOR);
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];

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
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Portaled to document.body rather than rendered in place: any caller that opens this
  // Modal from inside its own <form> (e.g. SettingsPage's single save-everything form)
  // would otherwise nest this component's <form> inside that outer <form>, which is
  // invalid HTML. Browsers silently break the inner form's submit behavior in that case
  // rather than erroring, so the bug is invisible without opening real dev tools.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white p-6 shadow-lg"
      >
        <h2 id="modal-title" className="mb-4 shrink-0 text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default Modal;
