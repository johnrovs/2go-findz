import Modal from '../Modal.jsx';
import Button from '../Button.jsx';

function ResetComparisonDialog({ isOpen, onClose, onConfirm }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reset Comparison?">
      <p className="mb-4 text-sm text-body">
        This replaces your current specifications and their values with a small default set. This can&apos;t be
        undone once you save.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm}>
          Reset Comparison
        </Button>
      </div>
    </Modal>
  );
}

export default ResetComparisonDialog;
