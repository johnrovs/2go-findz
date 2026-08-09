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

function SocialMediaStrip({ settings }) {
  const platforms = SOCIAL_PLATFORMS.filter((platform) => settings?.[platform.key]);
  if (platforms.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center divide-x divide-border">
      {platforms.map(({ key, label, Icon }) => {
        const url = settings[key];
        const handle = extractHandle(url);
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-2 text-body transition hover:text-primary"
          >
            <Icon className="h-5 w-5" />
            <span className="text-small font-semibold">{label}</span>
            {handle && <span className="text-small text-muted">{handle}</span>}
          </a>
        );
      })}
    </div>
  );
}

export default SocialMediaStrip;
