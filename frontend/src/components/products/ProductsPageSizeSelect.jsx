const PAGE_SIZES = [12, 24, 48];

function ProductsPageSizeSelect({ size, onChange }) {
  return (
    <div className="flex items-center gap-2 text-small text-body">
      <label htmlFor="products-page-size">Show</label>
      <select
        id="products-page-size"
        aria-label="Products per page"
        value={String(size)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-md border border-border px-2 py-1 text-small text-body focus:border-primary focus:outline-none"
      >
        {PAGE_SIZES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      per page
    </div>
  );
}

export default ProductsPageSizeSelect;
