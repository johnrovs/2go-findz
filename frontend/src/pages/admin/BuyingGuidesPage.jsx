import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { useToast } from '../../hooks/useToast.js';
import { getBuyingGuides, deleteBuyingGuide } from '../../services/adminBuyingGuideService.js';

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function BuyingGuidesPage() {
  const { showToast } = useToast();
  const [guides, setGuides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function loadGuides() {
    setIsLoading(true);
    setError(null);
    getBuyingGuides()
      .then(setGuides)
      .catch((err) => setError(err.message ?? 'Failed to load buying guides.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    // loadGuides resets loading/error state synchronously before fetching; this is
    // the standard reset-before-async-work pattern and can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadGuides();
  }, []);

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      await deleteBuyingGuide(deleteTarget.id);
      showToast('Buying guide deleted successfully.');
      setDeleteTarget(null);
      loadGuides();
    } catch (err) {
      showToast(err.message ?? 'Failed to delete buying guide.', 'error');
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
            <BookOpen className="h-5 w-5 text-slate-300" />
          </div>
        );
      },
    },
    { key: 'title', label: 'Title' },
    {
      key: 'active',
      label: 'Status',
      render: (row) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.active ? 'bg-success/10 text-success' : 'bg-surface-secondary text-muted'
          }`}
        >
          {row.active ? 'Published' : 'Draft'}
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
            to={`/admin/buying-guides/${row.id}`}
            aria-label={`Edit ${row.title}`}
            className="inline-flex rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.title}`}
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
        <h1 className="text-page-heading text-heading">Buying Guides</h1>
        <Button to="/admin/buying-guides/new" size="sm">
          <Plus size={16} />
          Add Guide
        </Button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadGuides} />
      ) : (
        <DataTable
          columns={columns}
          rows={guides}
          isLoading={isLoading}
          emptyState={
            <EmptyState title="No buying guides found" description="Add your first buying guide to get started." />
          }
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Buying Guide"
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

export default BuyingGuidesPage;
