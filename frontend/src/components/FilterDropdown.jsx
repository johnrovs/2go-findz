function FilterDropdown({ label, value, options, onChange }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-body">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-btn border border-border bg-white px-3 py-2 text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default FilterDropdown;
