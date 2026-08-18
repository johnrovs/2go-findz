import Button from '../Button.jsx';

function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString();
}

function PublishStatusCard({
  status,
  scheduledPublishAt,
  publishedAt,
  updatedAt,
  updatedBy,
  guideUrl,
  onPublish,
  onSchedule,
  onCancelSchedule,
}) {
  return (
    <div className="rounded-card border border-border bg-white p-5">
      <h3 className="mb-1 text-card-title text-heading">Publish Status</h3>
      <p className="mb-3 text-sm text-muted">
        {status === 'Draft' && "Your guide is in draft mode. It's not visible to the public."}
        {status === 'Scheduled' && `Scheduled to publish on ${formatDateTime(scheduledPublishAt)}.`}
        {status === 'Published' && `Published on ${formatDateTime(publishedAt)}.`}
      </p>
      {updatedAt && <p className="mb-1 text-xs text-muted">Last saved: {formatDateTime(updatedAt)}</p>}
      {updatedBy && <p className="mb-4 text-xs text-muted">Saved by: {updatedBy}</p>}

      {status === 'Published' && guideUrl && (
        <a href={guideUrl} target="_blank" rel="noreferrer" className="mb-4 block text-sm text-primary hover:underline">
          View Live Guide →
        </a>
      )}

      <div className="flex flex-col gap-2">
        <Button type="button" size="sm" onClick={onPublish}>
          {status === 'Published' ? 'Update Published Guide' : 'Publish Guide'}
        </Button>
        {status === 'Scheduled' && (
          <Button type="button" variant="secondary" size="sm" onClick={onCancelSchedule}>
            Cancel Schedule
          </Button>
        )}
        {status === 'Draft' && (
          <Button type="button" variant="secondary" size="sm" onClick={onSchedule}>
            Schedule Publish
          </Button>
        )}
      </div>
    </div>
  );
}

export default PublishStatusCard;
