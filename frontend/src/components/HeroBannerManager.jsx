import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import DataTable from './DataTable.jsx';
import Modal from './Modal.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import HeroBannerForm from './HeroBannerForm.jsx';
import EmptyState from './EmptyState.jsx';
import ErrorState from './ErrorState.jsx';
import { useToast } from '../hooks/useToast.js';
import { getImageUrl } from '../utils/imageUrl.js';
import {
  getHeroBanners,
  createHeroBanner,
  updateHeroBanner,
  deleteHeroBanner,
} from '../services/adminHeroBannerService.js';

function HeroBannerManager() {
  const { showToast } = useToast();
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalState, setModalState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function load() {
    setIsLoading(true);
    setError(null);
    getHeroBanners()
      .then(setBanners)
      .catch((err) => setError(err.message ?? 'Failed to load hero banner slides.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    // load() resets loading/error state synchronously before fetching; this is the
    // standard reset-before-async-work pattern and can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleFormSubmit(payload) {
    if (modalState.banner) {
      const updated = await updateHeroBanner(modalState.banner.id, payload);
      setBanners((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      showToast('Hero banner slide updated successfully.');
    } else {
      const created = await createHeroBanner(payload);
      setBanners((current) => [...current, created]);
      showToast('Hero banner slide created successfully.');
    }
    setModalState(null);
  }

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      await deleteHeroBanner(deleteTarget.id);
      setBanners((current) => current.filter((item) => item.id !== deleteTarget.id));
      showToast('Hero banner slide deleted successfully.');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message ?? 'Failed to delete hero banner slide.', 'error');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  const columns = [
    {
      key: 'imageFilename',
      label: 'Image',
      render: (row) => {
        const url = getImageUrl(row.imageFilename);
        return url ? <img src={url} alt={row.imageAlt} className="h-12 w-20 rounded-md object-cover" /> : null;
      },
    },
    { key: 'headline', label: 'Headline' },
    { key: 'badge', label: 'Badge', render: (row) => row.badge || '—' },
    { key: 'displayOrder', label: 'Order' },
    {
      key: 'active',
      label: 'Status',
      render: (row) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {row.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModalState({ banner: row })}
            aria-label={`Edit ${row.headline}`}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.headline}`}
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
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Hero Banner Slides</h3>
          <p className="mt-1 text-sm text-slate-500">
            When at least one active slide exists, the homepage shows a carousel instead of the single hero image
            above.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalState({ banner: null })}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Slide
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <DataTable
          columns={columns}
          rows={banners}
          onSortChange={() => {}}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              title="No hero banner slides yet"
              description="Add your first slide, or leave this empty to show the default hero image above."
            />
          }
        />
      )}

      {modalState && (
        <Modal
          isOpen
          onClose={() => setModalState(null)}
          title={modalState.banner ? 'Edit Hero Banner Slide' : 'Add Hero Banner Slide'}
        >
          <HeroBannerForm banner={modalState.banner} onSubmit={handleFormSubmit} onCancel={() => setModalState(null)} />
        </Modal>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Hero Banner Slide"
        message={
          deleteTarget
            ? `Are you sure you want to delete the "${deleteTarget.headline}" slide? This action cannot be undone.`
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

export default HeroBannerManager;
