import { CheckCircle, XCircle, X } from 'lucide-react';

const STYLES = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  error: 'bg-red-50 text-red-800 border-red-200',
};

function ToastNotification({ message, type = 'success', onDismiss }) {
  const Icon = type === 'error' ? XCircle : CheckCircle;
  return (
    <div role="status" className={`flex items-center gap-2 rounded-lg border px-4 py-3 shadow-sm ${STYLES[type]}`}>
      <Icon size={18} />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onDismiss} aria-label="Dismiss notification" className="ml-2 opacity-60 hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  );
}

export default ToastNotification;
