import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import ProductsPage from './pages/admin/ProductsPage.jsx';
import ProductFormPage from './pages/admin/ProductFormPage.jsx';
import CategoriesPage from './pages/admin/CategoriesPage.jsx';
import CategoryFormPage from './pages/admin/CategoryFormPage.jsx';
import SettingsPage from './pages/admin/SettingsPage.jsx';
import BuyingGuidesPage from './pages/admin/BuyingGuidesPage.jsx';
import BuyingGuideFormPage from './pages/admin/BuyingGuideFormPage.jsx';
import ComparisonsPage from './pages/admin/ComparisonsPage.jsx';
import ComparisonFormPage from './pages/admin/ComparisonFormPage.jsx';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/products/new" element={<ProductFormPage />} />
                  <Route path="/products/:id" element={<ProductFormPage />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/categories/new" element={<CategoryFormPage />} />
                  <Route path="/categories/:id" element={<CategoryFormPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/buying-guides" element={<BuyingGuidesPage />} />
                  <Route path="/buying-guides/new" element={<BuyingGuideFormPage />} />
                  <Route path="/buying-guides/:id" element={<BuyingGuideFormPage />} />
                  <Route path="/comparisons" element={<ComparisonsPage />} />
                  <Route path="/comparisons/new" element={<ComparisonFormPage />} />
                  <Route path="/comparisons/:id" element={<ComparisonFormPage />} />
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
