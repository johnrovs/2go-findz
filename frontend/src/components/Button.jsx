const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-btn text-btn transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const VARIANT_CLASSES = {
  primary: 'bg-primary text-white shadow-card hover:bg-primary-hover',
  secondary: 'bg-white text-primary border border-primary hover:bg-primary/5',
  amazon: 'bg-amazon text-[#111827] shadow-card hover:bg-amazon-hover',
};

const SIZE_CLASSES = {
  md: 'px-[28px] py-4',
  sm: 'px-4 py-2',
};

function Button({ variant = 'primary', size = 'md', href, className = '', children, ...rest }) {
  const classes = `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;

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
