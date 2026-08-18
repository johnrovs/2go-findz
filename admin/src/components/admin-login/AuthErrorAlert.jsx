import { AlertCircle } from 'lucide-react';

function AuthErrorAlert({ message }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="mb-6 flex items-start gap-2 rounded-[13px] border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

export default AuthErrorAlert;
