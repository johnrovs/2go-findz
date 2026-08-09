import { Check, X } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl.js';

function renderCellValue(rawValue) {
  const value = (rawValue ?? '').trim();
  if (!value) return <span aria-hidden="true">&mdash;</span>;
  const lower = value.toLowerCase();
  if (lower === 'yes') {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <Check size={16} aria-hidden="true" />
        <span className="sr-only">Yes</span>
      </span>
    );
  }
  if (lower === 'no') {
    return (
      <span className="inline-flex items-center gap-1 text-danger">
        <X size={16} aria-hidden="true" />
        <span className="sr-only">No</span>
      </span>
    );
  }
  return value;
}

function ComparisonTable({ comparisonTable, renderProductHeader }) {
  if (!comparisonTable || comparisonTable.rows.length === 0) return null;
  const { specificationNames, rows } = comparisonTable;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <caption className="sr-only">Comparison of {rows.map((row) => row.product.name).join(', ')}</caption>
        <thead className="bg-slate-900">
          <tr>
            <th scope="col" className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
              Feature
            </th>
            {rows.map((row) => {
              const imageUrl = getImageUrl(row.product.imageFileName);
              return (
                <th key={row.product.id} scope="col" className="p-3 text-center text-xs font-semibold text-white">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt=""
                      loading="lazy"
                      className="mx-auto mb-1 h-10 w-10 rounded-md object-cover"
                    />
                  )}
                  {renderProductHeader ? renderProductHeader(row.product) : row.product.name}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {specificationNames.map((name, specIndex) => (
            <tr key={name} className="odd:bg-white even:bg-surface-secondary">
              <th scope="row" className="border-b border-border p-3 text-left text-sm font-medium text-body">
                {name}
              </th>
              {rows.map((row) => (
                <td key={row.product.id} className="border-b border-border p-3 text-center text-sm text-body">
                  {renderCellValue(row.specificationValues[specIndex])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ComparisonTable;
