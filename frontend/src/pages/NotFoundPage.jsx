import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
      <h1 className="text-3xl font-bold text-slate-900">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-600">
        The page you are looking for doesn&apos;t exist or may have been moved.
      </p>
      <Link
        to="/"
        className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700"
      >
        Back to home
      </Link>
    </main>
  );
}

export default NotFoundPage;
