function FormField({ id, label, type = 'text', icon: Icon, trailing, error, value, onChange, autoComplete, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-[#0B1629]">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#667085]"
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-[52px] w-full rounded-[13px] border border-[#E5EAF2] bg-[#FAFAFC] text-[15px] text-[#0B1629] placeholder:text-[#667085]/70 focus:border-[#5B2CF2] focus:outline-none focus:ring-2 focus:ring-[#5B2CF2]/30 ${
            Icon ? 'pl-11' : 'pl-4'
          } ${trailing ? 'pr-11' : 'pr-4'}`}
        />
        {trailing}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default FormField;
