import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar.jsx';
import AdminTopbar from '../components/AdminTopbar.jsx';
import AdminFooter from '../components/AdminFooter.jsx';

function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const onMenuClick = () => setIsSidebarOpen(true);

  return (
    <div className="admin-scope flex min-h-screen bg-surface-secondary">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar onMenuClick={onMenuClick} />
        <main className="flex-1 p-6">
          {/* Routed pages that render their own sticky top bar (replacing
              AdminTopbar there, e.g. the Buying Guide editor) read this via
              useOutletContext() to still open the mobile sidebar drawer. */}
          <Outlet context={{ onMenuClick }} />
        </main>
        <AdminFooter />
      </div>
    </div>
  );
}

export default AdminLayout;
