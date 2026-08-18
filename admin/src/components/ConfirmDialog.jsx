import Modal from './Modal.jsx';
import Button from './Button.jsx';

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} role="alertdialog">
      <p className="text-body">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant={isDestructive ? 'danger' : 'primary'} size="sm" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? 'Please wait...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
