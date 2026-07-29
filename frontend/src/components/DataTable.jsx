import { ChevronUp, ChevronDown } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner.jsx';

function DataTable({ columns, rows, sortKey, sortDirection, onSortChange, isLoading, emptyState }) {
  if (isLoading) {
    return <LoadingSpinner label="Loading..." />;
  }

  if (rows.length === 0) {
    return emptyState;
  }

  return (
    <div className="overflow-x-auto rounded-card border border-slate-200 bg-white shadow-card">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-primary">
          <tr>
            {columns.map((column) => {
              const isSorted = sortKey === column.key;
              const ariaSort = isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={column.sortable ? ariaSort : undefined}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white"
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(column.key)}
                      className="flex items-center gap-1 hover:text-white/80"
                    >
                      {column.label}
                      {isSorted &&
                        (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-sm text-body">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
