import { useState } from 'react';
import Modal from '../Modal.jsx';
import Button from '../Button.jsx';
import PublishDatePicker from './PublishDatePicker.jsx';

function SchedulePublishDialog({ isOpen, initialValue, onConfirm, onCancel, isLoading }) {
  const [value, setValue] = useState(initialValue ?? '');
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const isPast = Boolean(value) && new Date(value) <= new Date();

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Schedule Publish">
      <label htmlFor="schedule-date" className="mb-1 block text-small font-medium text-body">
        Publication date and time
      </label>
      <PublishDatePicker id="schedule-date" value={value} onChange={setValue} />
      <p className="mt-1 text-xs text-muted">Time zone: {timeZone}</p>
      {isPast && <p className="mt-1 text-sm text-danger">Publish date must be in the future.</p>}
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={() => onConfirm(value)} disabled={isLoading || !value || isPast}>
          {isLoading ? 'Scheduling...' : 'Schedule Guide'}
        </Button>
      </div>
    </Modal>
  );
}

export default SchedulePublishDialog;
