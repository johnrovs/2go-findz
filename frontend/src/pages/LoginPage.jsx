import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const errors = {};
    if (!username.trim()) errors.username = 'Username is required.';
    if (!password) errors.password = 'Password is required.';
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await login(username, password);
      navigate('/admin', { replace: true });
    } catch (error) {
      setFormError(error.message ?? 'Invalid username or password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Admin Login</h1>

        {formError && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}

        <div className="mb-4">
          <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-invalid={Boolean(fieldErrors.username)}
            aria-describedby={fieldErrors.username ? 'username-error' : undefined}
          />
          {fieldErrors.username && (
            <p id="username-error" className="mt-1 text-sm text-red-600">
              {fieldErrors.username}
            </p>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {fieldErrors.password && (
            <p id="password-error" className="mt-1 text-sm text-red-600">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </main>
  );
}

export default LoginPage;
