function EmptyState({ title, description, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
      <h3 className="text-card-title text-heading">{title}</h3>
      {description && <p className="max-w-sm text-small text-body">{description}</p>}
      {children}
    </div>
  );
}

export default EmptyState;
