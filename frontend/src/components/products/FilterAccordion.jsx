import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

function FilterAccordion({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="border-t border-border py-4 first:border-t-0 first:pt-0">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-heading"
      >
        {title}
        <ChevronDown
          size={16}
          className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div id={panelId} className="mt-3">
          {children}
        </div>
      )}
    </div>
  );
}

export default FilterAccordion;
