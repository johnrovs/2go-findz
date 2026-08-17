import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { useToast } from '../../hooks/useToast.js';
import { getBuyingGuides, deleteBuyingGuide } from '../../services/adminBuyingGuideService.js';

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Mirrors deriveStatus() in BuyingGuideForm.jsx, which drives the editor's
// EditorHeader status pill -- kept in sync manually since that helper isn't exported.
function deriveStatus(guide) {
  if (guide.active) return 'Published';
  if (guide.scheduledPublishAt) return 'Scheduled';
  return 'Draft';
}

const TABLE_HEADER_GRADIENT = 'bg-[linear-gradient(90deg,#5B2CF2_0%,#6D35F5_55%,#5425E8_100%)]';

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
      render: (row) => {
        const status = deriveStatus(row);
        if (status === 'Published') return <StatusBadge variant="published">Published</StatusBadge>;
        if (status === 'Scheduled') return <StatusBadge variant="scheduled">Scheduled</StatusBadge>;
        return <StatusBadge variant="inactive">Draft</StatusBadge>;
      },
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
            title="Edit"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-muted hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            <Pencil size={14} />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.title}`}
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
          <h1 className="text-page-heading text-heading">Buying Guides</h1>
          <p className="mt-1 text-small text-muted">Manage in-depth buying guides for your storefront.</p>
        </div>
        <Button to="/admin/buying-guides/new" variant="accent" size="sm">
          <Plus size={16} />
          Add Guide
        </Button>
      </div>

      <div className="rounded-card border border-slate-200 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-small text-muted">{guides.length} buying guides</p>
        </div>

        <div className="px-5 pb-5 pt-5">
          {error ? (
            <ErrorState message={error} onRetry={loadGuides} />
          ) : (
            <DataTable
              columns={columns}
              rows={guides}
              isLoading={isLoading}
              headerClassName={TABLE_HEADER_GRADIENT}
              emptyState={
                <EmptyState title="No buying guides found" description="Add your first buying guide to get started." />
              }
            />
          )}
        </div>
      </div>

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
