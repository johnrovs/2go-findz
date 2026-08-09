function HeroTrustCard({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 rounded-card bg-white p-4 shadow-card-hover">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon size={20} aria-hidden="true" />
      </span>
      <div>
        <p className="text-card-title text-heading">{title}</p>
        <p className="text-small text-body">{description}</p>
      </div>
    </div>
  );
}

export default HeroTrustCard;
