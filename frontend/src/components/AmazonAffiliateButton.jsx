import Button from './Button.jsx';
import { isSupportedAmazonUrl } from '../utils/amazonLink.js';

function AmazonAffiliateButton({ productName, url, onClick, className = '', children }) {
  if (!isSupportedAmazonUrl(url)) {
    return (
      <span className={`block rounded-btn bg-slate-200 px-4 py-2 text-center text-sm font-semibold text-muted ${className}`}>
        Link unavailable
      </span>
    );
  }

  return (
    <Button
      variant="amazon"
      size="sm"
      href={url}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      aria-label={`View ${productName} on Amazon`}
      onClick={onClick}
      className={`w-full justify-center ${className}`}
    >
      {children ?? 'View on Amazon'}
    </Button>
  );
}

export default AmazonAffiliateButton;
