import ConfirmDialog from '../ConfirmDialog.jsx';

function DeleteFaqDialog({ faq, onConfirm, onCancel }) {
  return (
    <ConfirmDialog
      isOpen={Boolean(faq)}
      title="Delete FAQ?"
      message={faq ? `"${faq.question || 'Untitled question'}" and its answer will be permanently deleted.` : ''}
      confirmLabel="Delete FAQ"
      isDestructive
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

export default DeleteFaqDialog;
