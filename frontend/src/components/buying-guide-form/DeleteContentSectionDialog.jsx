import ConfirmDialog from '../ConfirmDialog.jsx';

function DeleteContentSectionDialog({ section, onConfirm, onCancel }) {
  return (
    <ConfirmDialog
      isOpen={Boolean(section)}
      title="Delete Section?"
      message={
        section
          ? `"${section.title || 'Untitled Section'}" has content. This will permanently delete the section and its content.`
          : ''
      }
      confirmLabel="Delete Section"
      isDestructive
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

export default DeleteContentSectionDialog;
