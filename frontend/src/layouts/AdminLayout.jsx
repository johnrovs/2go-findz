import { Outlet } from 'react-router-dom';

function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
