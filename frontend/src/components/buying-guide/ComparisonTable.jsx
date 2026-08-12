import { Check, Star, X } from 'lucide-react';

function renderCellValue(rawValue) {
  const value = (rawValue ?? '').trim();
  if (!value) return <span aria-hidden="true">&mdash;</span>;
  const lower = value.toLowerCase();
  if (lower === 'yes') {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <Check size={16} aria-hidden="true" />
        Yes
      </span>
    );
  }
  if (lower === 'no') {
    return (
      <span className="inline-flex items-center gap-1 text-danger">
        <X size={16} aria-hidden="true" />
        No
      </span>
    );
  }
  return value;
}

function formatPrice(product) {
  if (product.productPrice == null) return null;
  return `$${Number(product.productPrice).toFixed(2)}`;
}

function renderReviews(product) {
  if (product.rating == null) return <span aria-hidden="true">&mdash;</span>;
  const rounded = Math.round(product.rating);
  return (
    <span className="inline-flex items-center gap-1">
      <span className="flex" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            size={14}
            className={index < rounded ? 'text-star' : 'text-border'}
            fill={index < rounded ? 'currentColor' : 'none'}
          />
        ))}
      </span>
      <span className="text-body">({(product.reviewCount ?? 0).toLocaleString()})</span>
    </span>
  );
}

const HEADER_CELL_CLASSES = 'p-3 text-left text-xs font-semibold uppercase tracking-wide text-white';
const DATA_CELL_CLASSES = 'border-b border-border p-3 text-left text-sm text-body';

function ComparisonTable({ comparisonTable, renderProductName }) {
  if (!comparisonTable || comparisonTable.rows.length === 0) return null;
  const { specificationNames, rows } = comparisonTable;
  const extraSpecs = specificationNames
    .map((name, index) => ({ name, index }))
    .filter(({ name }) => !/price/i.test(name) && !/review|rating/i.test(name));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <caption className="sr-only">Comparison of {rows.map((row) => row.product.name).join(', ')}</caption>
        <thead className="bg-navy-950">
          <tr>
            <th scope="col" className={HEADER_CELL_CLASSES}>
              Product
            </th>
            <th scope="col" className={HEADER_CELL_CLASSES}>
              Price
            </th>
            <th scope="col" className={HEADER_CELL_CLASSES}>
              Reviews
            </th>
            {extraSpecs.map(({ name }) => (
              <th key={name} scope="col" className={HEADER_CELL_CLASSES}>
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const price = formatPrice(row.product);
            return (
              <tr key={row.product.id}>
                <th
                  scope="row"
                  className="border-b border-border p-3 text-left text-sm font-medium text-heading"
                >
                  {renderProductName ? renderProductName(row.product) : row.product.name}
                </th>
                <td className={DATA_CELL_CLASSES}>{price ?? <span aria-hidden="true">&mdash;</span>}</td>
                <td className={DATA_CELL_CLASSES}>{renderReviews(row.product)}</td>
                {extraSpecs.map(({ name, index }) => (
                  <td key={name} className={DATA_CELL_CLASSES}>
                    {renderCellValue(row.specificationValues[index])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ComparisonTable;
