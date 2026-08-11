import { ChevronLeft, ChevronRight } from 'lucide-react';

const SIBLING_COUNT = 1;

function getPageItems(page, totalPages) {
  const shown = new Set([1, totalPages]);
  for (let i = page - SIBLING_COUNT; i <= page + SIBLING_COUNT; i += 1) {
    if (i >= 1 && i <= totalPages) shown.add(i);
  }
  const sorted = Array.from(shown).sort((a, b) => a - b);

  const items = [];
  let previous = 0;
  sorted.forEach((number) => {
    if (previous && number - previous > 1) {
      items.push({ type: 'ellipsis', key: `ellipsis-${previous}` });
    }
    items.push({ type: 'page', key: number, number });
    previous = number;
  });
  return items;
}

function Pagination({ page, totalPages, onPageChange, activeClassName = 'bg-primary text-white' }) {
  if (totalPages <= 1) return null;

  const items = getPageItems(page, totalPages);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 pt-8">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="rounded-btn p-2 text-muted hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={18} />
      </button>

      {items.map((item) =>
        item.type === 'ellipsis' ? (
          <span key={item.key} aria-hidden="true" className="px-1 text-sm text-muted">
            …
          </span>
        ) : (
          <button
            key={item.key}
            type="button"
            onClick={() => onPageChange(item.number)}
            aria-current={item.number === page ? 'page' : undefined}
            className={`h-9 w-9 rounded-btn text-sm font-medium transition ${
              item.number === page ? activeClassName : 'text-body hover:bg-surface-secondary'
            }`}
          >
            {item.number}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="rounded-btn p-2 text-muted hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}

export default Pagination;
