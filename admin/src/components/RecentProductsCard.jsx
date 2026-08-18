import { Link } from 'react-router-dom';
import { Image as ImageIcon } from 'lucide-react';
import DataTable from './DataTable.jsx';
import EmptyState from './EmptyState.jsx';
import Button from './Button.jsx';
import ActionsMenu from './ActionsMenu.jsx';
import { getImageUrl } from '../utils/imageUrl.js';

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function RecentProductsCard({ products }) {
  const columns = [
    {
      key: 'name',
      label: 'Product',
      render: (row) => {
        const url = getImageUrl(row.imageFileName);
        return (
          <div className="flex items-center gap-3">
            {url ? (
              <img src={url} alt={row.name} className="h-10 w-10 shrink-0 rounded-md object-cover" />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100">
                <ImageIcon className="h-4 w-4 text-slate-300" />
              </div>
            )}
            <span className="truncate text-small font-medium text-heading">{row.name}</span>
          </div>
        );
      },
    },
    { key: 'categoryName', label: 'Category' },
    {
      key: 'active',
      label: 'Status',
      render: (row) =>
        row.active ? (
          <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
            Published
          </span>
        ) : (
          <span className="rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs font-medium text-muted">
            Draft
          </span>
        ),
    },
    { key: 'createdAt', label: 'Date Added', render: (row) => formatDate(row.createdAt) },
    {
      key: 'clicks',
      label: 'Clicks',
      render: (row) => <span className="block text-right">{row.clicks.toLocaleString('en-US')}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => <ActionsMenu editHref={`/products/${row.id}`} label={row.name} />,
    },
  ];

  return (
    <div className="flex h-full flex-col rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-card-title text-heading">Recent Products</h3>
        <Link to="/products" className="text-small font-semibold text-primary hover:underline">
          View all products
        </Link>
      </div>
      {products.length === 0 ? (
        <EmptyState title="No products yet" description="Add your first product to see it here." />
      ) : (
        <DataTable columns={columns} rows={products} isLoading={false} emptyState={null} />
      )}
      <Button to="/products" variant="secondary" size="sm" className="mt-4 w-full justify-center">
        View all products
      </Button>
    </div>
  );
}

export default RecentProductsCard;
