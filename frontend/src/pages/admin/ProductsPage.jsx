import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import DataTable from '../../components/DataTable.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import FilterDropdown from '../../components/FilterDropdown.jsx';
import Pagination from '../../components/Pagination.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { useToast } from '../../hooks/useToast.js';
import { useAdminProductSearch } from '../../hooks/useAdminProductSearch.js';
import { getImageUrl } from '../../utils/imageUrl.js';
import { deleteProduct } from '../../services/adminProductService.js';
import { getCategories } from '../../services/adminCategoryService.js';

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Products' },
  { value: 'trending', label: 'Trending' },
  { value: 'bestSeller', label: 'Best Sellers' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

function ProductsPage() {
  const { showToast } = useToast();
  const productSearch = useAdminProductSearch();
  const [categories, setCategories] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      showToast('Product deactivated successfully.');
      setDeleteTarget(null);
      productSearch.reload();
    } catch (err) {
      showToast(err.message ?? 'Failed to deactivate product.', 'error');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((category) => ({ value: String(category.id), label: category.productCategoryName })),
  ];

  const columns = [
    {
      key: 'imageFileName',
      label: 'Image',
      render: (row) => {
        const url = getImageUrl(row.imageFileName);
        return url ? (
          <img src={url} alt={row.name} className="h-12 w-12 rounded-md object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100">
            <ImageIcon className="h-5 w-5 text-slate-300" />
          </div>
        );
      },
    },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'categoryName', label: 'Category' },
    {
      key: 'productPrice',
      label: 'Price',
      sortable: true,
      render: (row) => `$${Number(row.productPrice).toFixed(2)}`,
    },
    {
      key: 'badges',
      label: 'Status',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {row.trending && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Trending
            </span>
          )}
          {row.bestSeller && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              Best Seller
            </span>
          )}
          {!row.active && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              Inactive
            </span>
          )}
        </div>
      ),
    },
    { key: 'createdAt', label: 'Created', sortable: true, render: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <Link
            to={`/admin/products/${row.id}`}
            aria-label={`Edit ${row.name}`}
            className="inline-flex rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.name}`}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
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
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        <Link
          to="/admin/products/new"
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Product
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="min-w-[240px] flex-1">
          <SearchInput value={productSearch.search} onChange={productSearch.setSearch} />
        </div>
        <FilterDropdown
          label="Category"
          value={productSearch.categoryId}
          options={categoryOptions}
          onChange={productSearch.setCategoryId}
        />
        <FilterDropdown
          label="Type"
          value={productSearch.filter}
          options={TYPE_OPTIONS}
          onChange={productSearch.setFilter}
        />
        <FilterDropdown
          label="Status"
          value={productSearch.status}
          options={STATUS_OPTIONS}
          onChange={productSearch.setStatus}
        />
      </div>

      {productSearch.error ? (
        <ErrorState message={productSearch.error} onRetry={productSearch.reload} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={productSearch.products}
            sortKey={productSearch.sortKey}
            sortDirection={productSearch.sortDirection}
            onSortChange={productSearch.onSortChange}
            isLoading={productSearch.isLoading}
            emptyState={
              <EmptyState
                title="No products found"
                description="Try adjusting your search or filters, or add your first product."
              />
            }
          />
          <Pagination
            page={productSearch.page}
            totalPages={productSearch.totalPages}
            onPageChange={productSearch.setPage}
          />
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Deactivate Product"
        message={
          deleteTarget
            ? `This will deactivate "${deleteTarget.name}" and remove it from the public catalog. You can reactivate it later from Edit.`
            : ''
        }
        confirmLabel="Deactivate"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default ProductsPage;
