import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, GitCompare } from 'lucide-react';
import DataTable from '../../components/DataTable.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { useToast } from '../../hooks/useToast.js';
import { getComparisons, deleteComparison } from '../../services/adminComparisonService.js';

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function ComparisonsPage() {
  const { showToast } = useToast();
  const [comparisons, setComparisons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function loadComparisons() {
    setIsLoading(true);
    setError(null);
    getComparisons()
      .then(setComparisons)
      .catch((err) => setError(err.message ?? 'Failed to load comparisons.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    // loadComparisons resets loading/error state synchronously before fetching; this is
    // the standard reset-before-async-work pattern and can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadComparisons();
  }, []);

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      await deleteComparison(deleteTarget.id);
      showToast('Comparison deleted successfully.');
      setDeleteTarget(null);
      loadComparisons();
    } catch (err) {
      showToast(err.message ?? 'Failed to delete comparison.', 'error');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  const columns = [
    {
      key: 'coverImageFilename',
      label: 'Cover',
      render: (row) => {
        const url = getImageUrl(row.coverImageFilename);
        return url ? (
          <img src={url} alt={row.title} className="h-12 w-12 rounded-md object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100">
            <GitCompare className="h-5 w-5 text-slate-300" />
          </div>
        );
      },
    },
    { key: 'title', label: 'Title' },
    { key: 'categoryName', label: 'Category' },
    {
      key: 'published',
      label: 'Status',
      render: (row) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {row.published ? 'Published' : 'Draft'}
        </span>
      ),
    },
    { key: 'createdAt', label: 'Created', render: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <Link
            to={`/admin/comparisons/${row.id}`}
            aria-label={`Edit ${row.title}`}
            className="inline-flex rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.title}`}
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
        <h1 className="text-2xl font-bold text-slate-900">Comparisons</h1>
        <Link
          to="/admin/comparisons/new"
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Comparison
        </Link>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadComparisons} />
      ) : (
        <DataTable
          columns={columns}
          rows={comparisons}
          isLoading={isLoading}
          emptyState={
            <EmptyState title="No comparisons found" description="Add your first comparison to get started." />
          }
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Comparison"
        message={deleteTarget ? `This will permanently delete "${deleteTarget.title}".` : ''}
        confirmLabel="Delete"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default ComparisonsPage;
