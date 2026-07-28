import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import Button from '../components/Button.jsx';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname ?? '/admin';
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
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(error.message ?? 'Invalid username or password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-secondary px-4">
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm rounded-card bg-white p-8 shadow-card">
        <h1 className="mb-6 text-page-heading text-heading">Admin Login</h1>

        {formError && (
          <p role="alert" className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
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
            className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            aria-invalid={Boolean(fieldErrors.username)}
            aria-describedby={fieldErrors.username ? 'username-error' : undefined}
          />
          {fieldErrors.username && (
            <p id="username-error" className="mt-1 text-sm text-danger">
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
              className="w-full rounded-btn border border-border px-3 py-2 pr-10 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
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
            <p id="password-error" className="mt-1 text-sm text-danger">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </main>
  );
}

export default LoginPage;
