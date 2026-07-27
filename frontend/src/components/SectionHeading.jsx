function SectionHeading({ title, description }) {
  return (
    <div className="mb-8 text-center">
      <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">{description}</p>}
    </div>
  );
}

export default SectionHeading;
