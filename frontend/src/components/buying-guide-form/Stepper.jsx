const STEPS = [
  'Basic Info',
  'Products',
  'Quick Picks',
  'Comparison',
  'Top Pick',
  'Runner-Ups',
  'Buying Guide',
  'FAQs',
  'SEO & Publish',
];

function Stepper() {
  return (
    <nav aria-label="Buying guide steps" className="mb-6 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-2">
        {STEPS.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === 1;
          return (
            <li key={label} className="flex items-center gap-2">
              <button
                type="button"
                disabled={!isActive}
                aria-current={isActive ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-btn px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-primary text-white' : 'cursor-not-allowed text-muted opacity-60'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isActive ? 'bg-white text-primary' : 'bg-slate-200 text-muted'
                  }`}
                >
                  {stepNumber}
                </span>
                {label}
              </button>
              {stepNumber < STEPS.length && <span className="h-px w-4 bg-border" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Stepper;
