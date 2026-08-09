import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ_PREVIEW_LIMIT = 5;

function BuyingGuideFaqAccordion({ faqs, onExpand }) {
  const [expandedIndexes, setExpandedIndexes] = useState(() => new Set());
  const [showAll, setShowAll] = useState(false);
  const visibleFaqs = showAll ? faqs : faqs.slice(0, FAQ_PREVIEW_LIMIT);

  function toggle(index, question) {
    setExpandedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
        onExpand?.(question);
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {visibleFaqs.map((faq, index) => {
        const isExpanded = expandedIndexes.has(index);
        const answerId = `faq-answer-${index}`;
        return (
          <div key={index} className="rounded-card border border-border p-4">
            <button
              type="button"
              onClick={() => toggle(index, faq.question)}
              aria-expanded={isExpanded}
              aria-controls={answerId}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="text-sm font-semibold text-heading">{faq.question}</span>
              <ChevronDown
                size={18}
                aria-hidden="true"
                className={`shrink-0 text-muted transition-transform motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            {isExpanded && (
              <p id={answerId} className="mt-2 whitespace-pre-line text-sm text-body">
                {faq.answer}
              </p>
            )}
          </div>
        );
      })}
      {faqs.length > FAQ_PREVIEW_LIMIT && (
        <button type="button" onClick={() => setShowAll((prev) => !prev)} className="text-sm font-semibold text-primary hover:underline">
          {showAll ? 'Show fewer questions' : `View all ${faqs.length} questions`}
        </button>
      )}
    </div>
  );
}

export default BuyingGuideFaqAccordion;
