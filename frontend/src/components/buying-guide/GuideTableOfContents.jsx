import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

function GuideTableOfContents({ items, activeId, onNavigate }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="rounded-card border border-border bg-white p-4 xl:sticky xl:top-16 xl:self-start">
      <button
        type="button"
        onClick={() => setIsMobileOpen((open) => !open)}
        aria-expanded={isMobileOpen}
        aria-controls="guide-toc-list"
        className="flex w-full items-center justify-between text-sm font-semibold text-heading xl:hidden"
      >
        Table of Contents
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 transition-transform motion-reduce:transition-none ${isMobileOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <span className="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-muted xl:block">Table of Contents</span>
      <ul id="guide-toc-list" className={`space-y-1 ${isMobileOpen ? 'mt-3 block' : 'hidden'} xl:mt-0 xl:block`}>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.anchorId}`}
              aria-current={activeId === item.id ? 'true' : undefined}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(item);
              }}
              className={`flex items-center gap-2 rounded-btn px-2 py-1.5 text-sm ${
                activeId === item.id ? 'bg-primary/10 font-semibold text-primary' : 'text-body hover:text-primary'
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {item.number}
              </span>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default GuideTableOfContents;
