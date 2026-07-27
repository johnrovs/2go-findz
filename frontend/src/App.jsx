import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import ProductsPage from './pages/admin/ProductsPage.jsx';
import CategoriesPage from './pages/admin/CategoriesPage.jsx';
import SettingsPage from './pages/admin/SettingsPage.jsx';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<DashboardPage />} />
                <Route path="/admin/products" element={<ProductsPage />} />
                <Route path="/admin/products/new" element={<ProductsPage />} />
                <Route path="/admin/products/:id" element={<ProductsPage />} />
                <Route path="/admin/categories" element={<CategoriesPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
