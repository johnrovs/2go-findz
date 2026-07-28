import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { CompareProvider } from './context/CompareContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import CompareBar from './components/CompareBar.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import TrendingPage from './pages/TrendingPage.jsx';
import BestSellersPage from './pages/BestSellersPage.jsx';
import PublicCategoriesPage from './pages/CategoriesPage.jsx';
import ComparePage from './pages/ComparePage.jsx';
import PublicBuyingGuidesPage from './pages/BuyingGuidesPage.jsx';
import BuyingGuideDetailPage from './pages/BuyingGuideDetailPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import ProductsPage from './pages/admin/ProductsPage.jsx';
import ProductFormPage from './pages/admin/ProductFormPage.jsx';
import CategoriesPage from './pages/admin/CategoriesPage.jsx';
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
          <CompareProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/trending" element={<TrendingPage />} />
                <Route path="/categories" element={<PublicCategoriesPage />} />
                <Route path="/best-sellers" element={<BestSellersPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/buying-guides" element={<PublicBuyingGuidesPage />} />
                <Route path="/buying-guides/:id" element={<BuyingGuideDetailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<DashboardPage />} />
                    <Route path="/admin/products" element={<ProductsPage />} />
                    <Route path="/admin/products/new" element={<ProductFormPage />} />
                    <Route path="/admin/products/:id" element={<ProductFormPage />} />
                    <Route path="/admin/categories" element={<CategoriesPage />} />
                    <Route path="/admin/settings" element={<SettingsPage />} />
                    <Route path="/admin/buying-guides" element={<BuyingGuidesPage />} />
                    <Route path="/admin/buying-guides/new" element={<BuyingGuideFormPage />} />
                    <Route path="/admin/buying-guides/:id" element={<BuyingGuideFormPage />} />
                    <Route path="/admin/comparisons" element={<ComparisonsPage />} />
                    <Route path="/admin/comparisons/new" element={<ComparisonFormPage />} />
                    <Route path="/admin/comparisons/:id" element={<ComparisonFormPage />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              <CompareBar />
            </BrowserRouter>
          </CompareProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
