function AdminFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 px-6 py-4">
      <p className="text-small text-muted">© {year} 2Go Findz. All rights reserved.</p>
    </footer>
  );
}

export default AdminFooter;
