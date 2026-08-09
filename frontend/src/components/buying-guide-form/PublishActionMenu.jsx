import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Button from '../Button.jsx';

function PublishActionMenu({ status, disabled, onPreview, onSaveDraft, onSchedule, onCopyLink, onUnpublish }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  function runAndClose(action) {
    setIsOpen(false);
    action();
  }

  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        size="sm"
        disabled={disabled}
        aria-label="More publish options"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((open) => !open)}
        className="rounded-l-none border-l border-white/20 px-2"
      >
        <ChevronDown size={16} />
      </Button>
      {isOpen && (
        <ul role="menu" className="absolute right-0 z-10 mt-2 w-56 rounded-btn border border-border bg-white py-1 shadow-dropdown">
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => runAndClose(onPreview)}
              className="block w-full px-4 py-2 text-left text-sm text-body hover:bg-surface-secondary"
            >
              Preview
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => runAndClose(onSaveDraft)}
              className="block w-full px-4 py-2 text-left text-sm text-body hover:bg-surface-secondary"
            >
              Save as Draft
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => runAndClose(onSchedule)}
              className="block w-full px-4 py-2 text-left text-sm text-body hover:bg-surface-secondary"
            >
              Schedule Publish
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => runAndClose(onCopyLink)}
              className="block w-full px-4 py-2 text-left text-sm text-body hover:bg-surface-secondary"
            >
              Copy Preview Link
            </button>
          </li>
          {status === 'Published' && (
            <li role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => runAndClose(onUnpublish)}
                className="block w-full px-4 py-2 text-left text-sm text-danger hover:bg-surface-secondary"
              >
                Unpublish
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export default PublishActionMenu;
