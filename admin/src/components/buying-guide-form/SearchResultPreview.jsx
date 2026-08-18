function SearchResultPreview({ seoTitle, metaDescription, url }) {
  return (
    <div className="rounded-card border border-border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-heading">Google Search Preview</h3>
      <div className="rounded-btn border border-border bg-surface-secondary p-4">
        <div className="mb-1 flex items-center gap-2 text-xs text-muted">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
            2G
          </span>
          <span>2Go Findz</span>
        </div>
        <p className="mb-1 truncate text-xs text-muted">{url}</p>
        <p className="truncate text-lg text-[#1a0dab]">{seoTitle || 'Untitled guide'}</p>
        <p className="line-clamp-2 text-sm text-body">{metaDescription || 'No description provided yet.'}</p>
      </div>
      <p className="mt-2 text-xs text-muted">Preview only — actual search results may differ.</p>
    </div>
  );
}

export default SearchResultPreview;
