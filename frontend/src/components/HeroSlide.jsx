import { Link } from 'react-router-dom';

function HeroSlide({
  imageUrl,
  imageAlt,
  badge,
  headline,
  description,
  buttonText,
  buttonTo,
  onButtonClick,
  isPriority,
}) {
  const buttonClassName =
    'inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2';

  return (
    <div className="relative flex min-h-[420px] items-center overflow-hidden bg-slate-900 sm:min-h-[480px]">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={imageAlt}
          loading={isPriority ? 'eager' : 'lazy'}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-slate-900/10" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          {badge && (
            <span className="mb-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              {badge}
            </span>
          )}
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">{headline}</h1>
          {description && <p className="mt-4 text-lg text-slate-200">{description}</p>}
          <div className="mt-8">
            {buttonTo ? (
              <Link to={buttonTo} className={buttonClassName}>
                {buttonText}
              </Link>
            ) : (
              <button type="button" onClick={onButtonClick} className={buttonClassName}>
                {buttonText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroSlide;
