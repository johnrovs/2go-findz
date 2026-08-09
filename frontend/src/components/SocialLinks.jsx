import { SOCIAL_PLATFORMS } from '../utils/socialPlatforms.jsx';

function SocialLinks({ settings }) {
  const links = SOCIAL_PLATFORMS.filter((link) => settings?.[link.key]);

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {links.map(({ key, label, Icon }) => (
        <a
          key={key}
          href={settings[key]}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600"
        >
          <Icon className="h-[18px] w-[18px]" />
          {label}
        </a>
      ))}
    </div>
  );
}

export default SocialLinks;
