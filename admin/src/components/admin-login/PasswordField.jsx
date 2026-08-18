import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import FormField from './FormField.jsx';

function PasswordField({ id, label, value, onChange, error, autoComplete }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <FormField
      id={id}
      label={label}
      type={showPassword ? 'text' : 'password'}
      icon={Lock}
      value={value}
      onChange={onChange}
      error={error}
      autoComplete={autoComplete}
      trailing={
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#667085] hover:text-dashboard-purple"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
    />
  );
}

export default PasswordField;
