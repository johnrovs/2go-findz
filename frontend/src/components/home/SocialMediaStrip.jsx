import { Fragment } from 'react';
import { SOCIAL_PLATFORMS } from '../../utils/socialPlatforms.jsx';

function extractHandle(url) {
  try {
    const { pathname } = new URL(url);
    const segment = pathname.replace(/\/$/, '').split('/').pop();
    return segment ? `@${segment.replace(/^@/, '')}` : null;
  } catch {
    return null;
  }
}

function SocialMediaStrip({ settings, variant = 'pill' }) {
  const platforms = SOCIAL_PLATFORMS.filter((platform) => settings?.[platform.key]);
  if (platforms.length === 0) return null;

  const isCompact = variant === 'compact';
  const containerClassName = isCompact
    ? 'mx-auto flex w-full max-w-full flex-wrap items-center justify-center gap-x-5 gap-y-4 rounded-3xl bg-white px-6 py-4 text-center shadow-card'
    : 'mx-auto flex w-full max-w-full flex-wrap items-center justify-center gap-x-5 gap-y-4 rounded-3xl bg-white px-6 py-4 text-center shadow-card sm:justify-between sm:gap-x-6 sm:rounded-full sm:px-8 sm:py-3';

  return (
    <div className={containerClassName}>
      <p className="whitespace-nowrap text-small font-semibold text-heading">Follow 2Go Findz for daily finds & deals</p>
      {platforms.map(({ key, label, Icon, iconBgClassName }) => {
        const url = settings[key];
        const handle = extractHandle(url);
        return (
          <Fragment key={key}>
            {!isCompact && <span className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 transition hover:opacity-80"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${iconBgClassName}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex flex-col text-left leading-tight">
                <span className="text-small font-semibold text-heading">{label}</span>
                {handle && <span className="text-small text-muted">{handle}</span>}
              </span>
            </a>
          </Fragment>
        );
      })}
    </div>
  );
}

export default SocialMediaStrip;
