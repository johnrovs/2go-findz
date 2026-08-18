import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Image as ImageIcon, Search } from 'lucide-react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useToast } from '../../hooks/useToast.js';
import { getImageUrl } from '../../utils/imageUrl.js';
import { getCategories, deleteCategory } from '../../services/adminCategoryService.js';

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const TABLE_HEADER_GRADIENT = 'bg-[linear-gradient(90deg,#5B2CF2_0%,#6D35F5_55%,#5425E8_100%)]';

function CategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('productCategoryName');
  const [sortDirection, setSortDirection] = useState('asc');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function loadCategories() {
    setIsLoading(true);
    setError(null);
    getCategories({ sortBy: sortKey, direction: sortDirection })
      .then(setCategories)
      .catch((err) => setError(err.message ?? 'Failed to load categories.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    // loadCategories resets loading/error state synchronously before fetching; this is
    // the standard reset-before-async-work pattern and can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortKey, sortDirection]);

  const visibleCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const term = search.trim().toLowerCase();
    return categories.filter((category) => category.productCategoryName.toLowerCase().includes(term));
  }, [categories, search]);

  function handleSortChange(key) {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      await deleteCategory(deleteTarget.id);
      setCategories((current) => current.filter((item) => item.id !== deleteTarget.id));
      showToast('Category deleted successfully.');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message ?? 'Failed to delete category.', 'error');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  const columns = [
    {
      key: 'imageFileName',
      label: 'Image',
      render: (row) => {
        const url = getImageUrl(row.imageFileName);
        return url ? (
          <img src={url} alt={row.productCategoryName} className="h-12 w-12 rounded-md object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100">
            <ImageIcon className="h-5 w-5 text-slate-300" />
          </div>
        );
      },
    },
    { key: 'productCategoryName', label: 'Category Name', sortable: true },
    {
      key: 'commissionRate',
      label: 'Commission Rate',
      sortable: true,
      render: (row) => `${Number(row.commissionRate).toFixed(2)}%`,
    },
    {
      key: 'active',
      label: 'Status',
      render: (row) =>
        row.active ? (
          <StatusBadge variant="published">Active</StatusBadge>
        ) : (
          <StatusBadge variant="inactive">Inactive</StatusBadge>
        ),
    },
    { key: 'createdAt', label: 'Created', sortable: true, render: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <Link
            to={`/categories/${row.id}`}
            aria-label={`Edit ${row.productCategoryName}`}
            title="Edit"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-muted hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            <Pencil size={14} />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.productCategoryName}`}
            title="Delete"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-muted hover:border-danger hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-page-heading text-heading">Product Categories</h1>
          <p className="mt-1 text-small text-muted">Organize your storefront&apos;s product categories.</p>
        </div>
        <Button to="/categories/new" variant="accent" size="sm">
          <Plus size={16} />
          Add Category
        </Button>
      </div>

      <div className="rounded-card border border-slate-200 bg-white shadow-card">
        <div className="p-5">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search categories..."
              aria-label="Search categories"
              className="w-full rounded-search border border-border py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 px-5 py-3">
          <p className="text-small text-muted">{visibleCategories.length} categories</p>
        </div>

        <div className="px-5 pb-5">
          {error ? (
            <ErrorState message={error} onRetry={loadCategories} />
          ) : (
            <DataTable
              columns={columns}
              rows={visibleCategories}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              isLoading={isLoading}
              headerClassName={TABLE_HEADER_GRADIENT}
              emptyState={
                <EmptyState
                  title={search ? 'No matching categories' : 'No categories yet'}
                  description={
                    search ? 'Try a different search term.' : 'Add your first product category to get started.'
                  }
                />
              }
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Category"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.productCategoryName}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default CategoriesPage;
