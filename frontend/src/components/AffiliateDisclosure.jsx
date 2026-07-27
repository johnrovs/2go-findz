function AffiliateDisclosure({ text }) {
  return (
    <p className="text-sm leading-relaxed text-slate-500">
      {text ||
        'As an Amazon Associate, 2Go Findz may earn from qualifying purchases. Product prices and availability may change at any time.'}
    </p>
  );
}

export default AffiliateDisclosure;
