import { useState } from 'react';
import { X } from 'lucide-react';

const MAX_KEYWORDS = 10;
const MAX_KEYWORD_LENGTH = 60;

function KeywordTagInput({ keywords, onChange, id = 'seo-keywords' }) {
  const [inputValue, setInputValue] = useState('');
  const atMax = keywords.length >= MAX_KEYWORDS;

  function addKeyword(raw) {
    const trimmed = raw.trim();
    if (!trimmed || atMax) return;
    const isDuplicate = keywords.some((keyword) => keyword.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) return;
    onChange([...keywords, trimmed.slice(0, MAX_KEYWORD_LENGTH)]);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addKeyword(inputValue);
      setInputValue('');
    } else if (event.key === 'Backspace' && inputValue === '' && keywords.length > 0) {
      onChange(keywords.slice(0, -1));
    }
  }

  function removeKeyword(index) {
    onChange(keywords.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-btn border border-border p-2">
        {keywords.map((keyword, index) => (
          <span key={keyword} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
            {keyword}
            <button
              type="button"
              onClick={() => removeKeyword(index)}
              aria-label={`Remove ${keyword}`}
              className="text-primary hover:text-primary-hover"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={atMax}
          placeholder={atMax ? `Maximum ${MAX_KEYWORDS} keywords` : 'Add a keyword...'}
          className="min-w-[120px] flex-1 border-none px-1 py-1 text-slate-900 focus:outline-none disabled:bg-transparent"
        />
      </div>
      <p className="mt-1 text-xs text-muted">Add relevant supporting phrases separated by commas.</p>
    </div>
  );
}

export default KeywordTagInput;
