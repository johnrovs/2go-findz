function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  );
}

export default LoadingSpinner;
