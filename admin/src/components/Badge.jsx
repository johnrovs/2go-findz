function Badge({ children }) {
  return (
    <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-small text-white">
      {children}
    </span>
  );
}

export default Badge;
