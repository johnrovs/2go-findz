import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Image as ImageIcon, FileUp } from 'lucide-react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import FilterDropdown from '../../components/FilterDropdown.jsx';
import Pagination from '../../components/Pagination.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import ImportProductsModal from '../../components/ImportProductsModal.jsx';
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

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'name,asc', label: 'Name A–Z' },
  { value: 'productPrice,asc', label: 'Price: low to high' },
  { value: 'productPrice,desc', label: 'Price: high to low' },
];

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
];

const TABLE_HEADER_GRADIENT = 'bg-[linear-gradient(90deg,#5B2CF2_0%,#6D35F5_55%,#5425E8_100%)]';

function ProductsPage() {
  const { showToast } = useToast();
  const productSearch = useAdminProductSearch();
  const [categories, setCategories] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

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

  function handleClearFilters() {
    productSearch.clearFilters();
  }

  function handleImportComplete(result) {
    productSearch.setPage(1);
    productSearch.reload();
    showToast(
      `${result.importedProducts} products and ${result.createdCategories} new categories were imported successfully.`
    );
  }

  function handleSortChange(value) {
    const [nextSortKey, nextSortDirection] = value.split(',');
    productSearch.setSort(nextSortKey, nextSortDirection);
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
    { key: 'name', label: 'Product', sortable: true },
    { key: 'categoryName', label: 'Category' },
    { key: 'brand', label: 'Brand', render: (row) => row.brand || '—' },
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
          {row.trending && <StatusBadge variant="trending">Trending</StatusBadge>}
          {row.bestSeller && <StatusBadge variant="bestSeller">Best Seller</StatusBadge>}
          {row.scheduledPublishAt && <StatusBadge variant="scheduled">Scheduled</StatusBadge>}
          {row.active && !row.trending && !row.bestSeller && !row.scheduledPublishAt && (
            <StatusBadge variant="published">Published</StatusBadge>
          )}
          {!row.active && <StatusBadge variant="inactive">Inactive</StatusBadge>}
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
            title="Edit"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-muted hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            <Pencil size={14} />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.name}`}
            title="Delete"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-muted hover:border-danger hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const rangeStart = productSearch.totalElements === 0 ? 0 : (productSearch.page - 1) * productSearch.pageSize + 1;
  const rangeEnd = Math.min(productSearch.page * productSearch.pageSize, productSearch.totalElements);
  const paginationSummary = `Showing ${rangeStart}–${rangeEnd} of ${productSearch.totalElements} products`;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[46px] font-extrabold leading-tight text-heading">Products</h1>
          <p className="mt-1 text-small text-muted">Manage, organize, and publish products across your storefront.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
            <FileUp size={16} />
            Import Products
          </Button>
          <Button to="/admin/products/new" variant="accent" size="sm">
            <Plus size={16} />
            Add Product
          </Button>
        </div>
      </div>

      <div className="rounded-card border border-slate-200 bg-white shadow-card">
        <div className="flex flex-wrap items-end gap-4 p-5">
          <div className="w-full min-w-[240px] flex-1 sm:w-auto">
            <SearchInput value={productSearch.search} onChange={productSearch.setSearch} />
          </div>
          <div className="w-full sm:w-auto">
            <FilterDropdown
              label="Category"
              value={productSearch.categoryId}
              options={categoryOptions}
              onChange={productSearch.setCategoryId}
            />
          </div>
          <div className="w-full sm:w-auto">
            <FilterDropdown label="Type" value={productSearch.filter} options={TYPE_OPTIONS} onChange={productSearch.setFilter} />
          </div>
          <div className="w-full sm:w-auto">
            <FilterDropdown
              label="Status"
              value={productSearch.status}
              options={STATUS_OPTIONS}
              onChange={productSearch.setStatus}
            />
          </div>
          <button
            type="button"
            onClick={handleClearFilters}
            className="w-full text-small font-medium text-primary hover:underline sm:w-auto"
          >
            Clear filters
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
          <p className="text-small text-muted">{productSearch.totalElements} products</p>
          <div className="w-full sm:w-auto">
            <FilterDropdown
              label="Sort by"
              value={`${productSearch.sortKey},${productSearch.sortDirection}`}
              options={SORT_OPTIONS}
              onChange={handleSortChange}
            />
          </div>
        </div>

        <div className="px-5 pb-5">
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
                headerClassName={TABLE_HEADER_GRADIENT}
                emptyState={
                  <EmptyState
                    title="No products found"
                    description="Try adjusting your search or filters, or add your first product."
                  />
                }
              />
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                <Pagination page={productSearch.page} totalPages={productSearch.totalPages} onPageChange={productSearch.setPage} summary={paginationSummary} />
                <div className="w-full sm:w-auto">
                  <FilterDropdown
                    label="Rows per page"
                    value={String(productSearch.pageSize)}
                    options={PAGE_SIZE_OPTIONS}
                    onChange={(value) => productSearch.setPageSize(Number(value))}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

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

      <ImportProductsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}

export default ProductsPage;
