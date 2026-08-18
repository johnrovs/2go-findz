import { Link } from 'react-router-dom';

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-btn text-btn transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const VARIANT_CLASSES = {
  primary: 'bg-amazon text-white shadow-card hover:bg-amazon-hover',
  secondary: 'bg-white text-heading border border-heading hover:bg-heading/5',
  amazon: 'bg-amazon text-white shadow-card hover:bg-amazon-hover',
  danger: 'bg-danger text-white shadow-card hover:bg-red-700',
  accent: 'bg-dashboard-orange text-white shadow-card hover:opacity-90',
  outline: 'bg-white text-primary border border-primary hover:bg-primary hover:text-white',
};

const SIZE_CLASSES = {
  md: 'px-[28px] py-4',
  sm: 'px-4 py-2',
};

function Button({ variant = 'primary', size = 'md', href, to, className = '', children, ...rest }) {
  const classes = `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}

export default Button;
