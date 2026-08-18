import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import logo from '../assets/2gofindz.png';
import AdminBrandingPanel from '../components/admin-login/AdminBrandingPanel.jsx';
import AdminLoginCard from '../components/admin-login/AdminLoginCard.jsx';

function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname ?? '/';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const errors = {};
    if (!username.trim()) errors.username = 'Email address is required.';
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

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <main
      className="flex min-h-screen flex-col lg:h-screen lg:flex-row"
      style={{
        background: 'radial-gradient(circle at center, rgba(91, 44, 242, 0.08), transparent 45%), #fafafc',
      }}
    >
      <AdminBrandingPanel />

      <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-10 lg:px-10">
        <Link
          to="/"
          className="absolute right-5 top-5 flex items-center gap-1.5 text-sm font-medium text-[#667085] transition-colors hover:text-dashboard-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-purple focus-visible:ring-offset-2 lg:right-10 lg:top-10"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to storefront
        </Link>

        {/* The logo's wordmark is near-white for the dark navbar/sidebar it's normally shown on — give it a dark chip here since this section's background is light. */}
        <div className="mb-8 rounded-xl bg-[#020D18] px-5 py-3 lg:hidden">
          <img src={logo} alt="2Go Findz" className="h-8" />
        </div>

        <AdminLoginCard
          username={username}
          onUsernameChange={setUsername}
          password={password}
          onPasswordChange={setPassword}
          usernameError={fieldErrors.username}
          passwordError={fieldErrors.password}
          formError={formError}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />

        <p className="mt-8 text-xs text-[#667085]">© 2026 2Go Findz. All rights reserved.</p>
      </div>
    </main>
  );
}

export default LoginPage;
