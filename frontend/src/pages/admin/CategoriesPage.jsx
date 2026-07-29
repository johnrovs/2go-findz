import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import Modal from '../../components/Modal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import CategoryForm from '../../components/CategoryForm.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { useToast } from '../../hooks/useToast.js';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../services/adminCategoryService.js';

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function CategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('productCategoryName');
  const [sortDirection, setSortDirection] = useState('asc');
  const [modalState, setModalState] = useState(null);
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

  async function handleFormSubmit(payload) {
    if (modalState.category) {
      const updated = await updateCategory(modalState.category.id, payload);
      setCategories((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      showToast('Category updated successfully.');
    } else {
      const created = await createCategory(payload);
      setCategories((current) => [...current, created]);
      showToast('Category created successfully.');
    }
    setModalState(null);
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
    { key: 'productCategoryName', label: 'Category Name', sortable: true },
    {
      key: 'commissionRate',
      label: 'Commission Rate',
      sortable: true,
      render: (row) => `${Number(row.commissionRate).toFixed(2)}%`,
    },
    { key: 'createdAt', label: 'Created', sortable: true, render: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModalState({ category: row })}
            aria-label={`Edit ${row.productCategoryName}`}
            className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.productCategoryName}`}
            className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-page-heading text-heading">Product Categories</h1>
        <Button onClick={() => setModalState({ category: null })} size="sm">
          <Plus size={16} />
          Add Category
        </Button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search categories..."
          aria-label="Search categories"
          className="w-full max-w-sm rounded-search border border-border px-3 py-2 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

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

      {modalState && (
        <Modal
          isOpen
          onClose={() => setModalState(null)}
          title={modalState.category ? 'Edit Category' : 'Add Category'}
        >
          <CategoryForm
            category={modalState.category}
            onSubmit={handleFormSubmit}
            onCancel={() => setModalState(null)}
          />
        </Modal>
      )}

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
