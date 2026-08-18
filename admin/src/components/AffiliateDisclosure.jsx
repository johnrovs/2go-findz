function AffiliateDisclosure({ text, className = 'text-sm leading-relaxed text-slate-500' }) {
  return (
    <p className={className}>
      {text ||
        'As an Amazon Associate, 2Go Findz may earn from qualifying purchases. Product prices and availability may change at any time.'}
    </p>
  );
}

export default AffiliateDisclosure;
