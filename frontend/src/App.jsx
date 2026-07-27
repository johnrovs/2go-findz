import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import TrendingPage from './pages/TrendingPage.jsx';
import BestSellersPage from './pages/BestSellersPage.jsx';
import PublicCategoriesPage from './pages/CategoriesPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import ProductsPage from './pages/admin/ProductsPage.jsx';
import ProductFormPage from './pages/admin/ProductFormPage.jsx';
import CategoriesPage from './pages/admin/CategoriesPage.jsx';
import SettingsPage from './pages/admin/SettingsPage.jsx';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/trending" element={<TrendingPage />} />
              <Route path="/categories" element={<PublicCategoriesPage />} />
              <Route path="/best-sellers" element={<BestSellersPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<DashboardPage />} />
                  <Route path="/admin/products" element={<ProductsPage />} />
                  <Route path="/admin/products/new" element={<ProductFormPage />} />
                  <Route path="/admin/products/:id" element={<ProductFormPage />} />
                  <Route path="/admin/categories" element={<CategoriesPage />} />
                  <Route path="/admin/settings" element={<SettingsPage />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
