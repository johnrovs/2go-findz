import { Facebook, Instagram, Youtube } from 'lucide-react';

// lucide-react doesn't ship dedicated TikTok/Pinterest icons; use simple inline SVGs for those two.
function TikTokIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z" />
    </svg>
  );
}

function PinterestIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 0a12 12 0 0 0-4.37 23.17c-.06-.94-.11-2.38.02-3.4.12-.93.8-5.95.8-5.95s-.2-.41-.2-1.01c0-.94.55-1.65 1.23-1.65.58 0 .86.44.86.96 0 .59-.37 1.46-.57 2.28-.16.68.35 1.24 1.02 1.24 1.22 0 2.16-1.29 2.16-3.15 0-1.65-1.18-2.8-2.87-2.8-1.96 0-3.11 1.47-3.11 2.98 0 .59.23 1.22.51 1.57a.2.2 0 0 1 .05.2c-.05.22-.18.68-.2.78-.03.13-.11.16-.25.1-.94-.44-1.53-1.81-1.53-2.91 0-2.37 1.72-4.55 4.96-4.55 2.6 0 4.63 1.86 4.63 4.34 0 2.59-1.63 4.67-3.9 4.67-.76 0-1.48-.4-1.72-.86l-.47 1.78c-.17.65-.63 1.47-.94 1.97A12 12 0 1 0 12 0z" />
    </svg>
  );
}

export const SOCIAL_PLATFORMS = [
  { key: 'tiktokUrl', label: 'TikTok', Icon: TikTokIcon },
  { key: 'pinterestUrl', label: 'Pinterest', Icon: PinterestIcon },
  { key: 'instagramUrl', label: 'Instagram', Icon: Instagram },
  { key: 'youtubeUrl', label: 'YouTube', Icon: Youtube },
  { key: 'facebookUrl', label: 'Facebook', Icon: Facebook },
];
