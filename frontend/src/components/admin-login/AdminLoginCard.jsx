import { ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import FormField from './FormField.jsx';
import PasswordField from './PasswordField.jsx';
import AuthErrorAlert from './AuthErrorAlert.jsx';

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function AdminLoginCard({
  username,
  onUsernameChange,
  password,
  onPasswordChange,
  usernameError,
  passwordError,
  formError,
  isSubmitting,
  onSubmit,
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : 'hidden'}
      animate="visible"
      variants={cardVariants}
      className="relative w-full max-w-[520px] overflow-hidden rounded-[22px] border border-[#E5EAF2] bg-white p-11 shadow-[0_20px_60px_rgba(11,22,41,0.12),0_4px_16px_rgba(11,22,41,0.06)] max-sm:p-8"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: 'linear-gradient(90deg, #5b2cf2, #7c3aed, #ff7a00)' }}
      />

      <motion.div variants={itemVariants} className="mb-6 flex justify-center">
        <div
          className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] shadow-[0_0_30px_rgba(91,44,242,0.35)]"
          style={{ background: 'linear-gradient(135deg, #5b2cf2, #7c3aed)' }}
        >
          <ShieldCheck size={34} className="text-white" aria-hidden="true" />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="mb-8 text-center">
        <h1 className="text-[38px] font-extrabold leading-tight text-[#0B1629]">Welcome back</h1>
        <p className="mt-2 text-[15px] text-[#667085]">Sign in to your 2Go Findz admin account.</p>
      </motion.div>

      <AuthErrorAlert message={formError} />

      <form onSubmit={onSubmit} noValidate>
        <motion.div variants={itemVariants} className="mb-4">
          <FormField
            id="username"
            label="Email address"
            icon={Mail}
            placeholder="admin@2gofindz.com"
            autoComplete="username"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            error={usernameError}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="mb-6">
          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            error={passwordError}
            autoComplete="current-password"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[13px] text-[16px] font-bold text-white shadow-[0_10px_30px_rgba(91,44,242,0.35)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B2CF2] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            style={{ background: 'linear-gradient(90deg, #5b2cf2, #6d35f5, #7c3aed)' }}
          >
            {isSubmitting ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
        </motion.div>
      </form>

      <div className="mt-8 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#E5EAF2]" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[#667085]">Admin Portal</span>
        <div className="h-px flex-1 bg-[#E5EAF2]" />
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#667085]">
        <Lock size={12} aria-hidden="true" />
        Authorized administrators only.
      </p>
    </motion.div>
  );
}

export default AdminLoginCard;
