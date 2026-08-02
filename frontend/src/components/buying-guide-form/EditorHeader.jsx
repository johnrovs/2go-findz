import { useState } from 'react';
import { ChevronDown, Eye } from 'lucide-react';
import Button from '../Button.jsx';
import ConfirmDialog from '../ConfirmDialog.jsx';

const STATUS_STYLES = {
  Draft: 'bg-slate-100 text-slate-600',
  Scheduled: 'bg-warning/10 text-warning',
  Published: 'bg-success/10 text-success',
};

function EditorHeader({ isEditMode, status, onPreview, onSaveDraft, onPublish, onCancel, isSubmitting }) {
  const [isConfirmingPublish, setIsConfirmingPublish] = useState(false);

  function handleConfirmPublish() {
    setIsConfirmingPublish(false);
    onPublish();
  }

  return (
    // top-12 (48px) matches AdminTopbar's measured rendered height (~48.7px),
    // confirmed via getComputedStyle during browser verification.
    <div className="sticky top-12 z-20 -mx-6 mb-6 border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button type="button" onClick={onCancel} className="mb-1 text-sm font-medium text-muted hover:text-primary">
            &larr; Buying Guides
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-card-title text-heading">{isEditMode ? 'Edit Buying Guide' : 'Add Buying Guide'}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>{status}</span>
          </div>
          <p className="text-sm text-muted">Manage your buying guide&apos;s basic information, content, and settings.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onPreview} disabled={isSubmitting}>
            <Eye size={16} />
            Preview
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onSaveDraft} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save as Draft'}
          </Button>
          <div className="flex">
            <Button
              type="button"
              size="sm"
              onClick={() => setIsConfirmingPublish(true)}
              disabled={isSubmitting}
              className="rounded-r-none"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Guide'}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              aria-label="More publish options"
              className="rounded-l-none border-l border-white/20 px-2"
            >
              <ChevronDown size={16} />
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmingPublish}
        title="Publish this guide?"
        message="This makes the guide live immediately, overriding its current status and any scheduled date."
        confirmLabel="Publish"
        isLoading={isSubmitting}
        onConfirm={handleConfirmPublish}
        onCancel={() => setIsConfirmingPublish(false)}
      />
    </div>
  );
}

export default EditorHeader;
