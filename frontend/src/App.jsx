import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CompareProvider } from './context/CompareContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import CompareBar from './components/CompareBar.jsx';
import HomePage from './pages/HomePage.jsx';
import AllProductsPage from './pages/AllProductsPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx';
import TermsOfUsePage from './pages/TermsOfUsePage.jsx';
import AffiliateDisclosurePage from './pages/AffiliateDisclosurePage.jsx';
import TrendingPage from './pages/TrendingPage.jsx';
import BestSellersPage from './pages/BestSellersPage.jsx';
import PublicCategoriesPage from './pages/CategoriesPage.jsx';
import ComparePage from './pages/ComparePage.jsx';
import PublicBuyingGuidesPage from './pages/BuyingGuidesPage.jsx';
import PublishedBuyingGuidePage from './pages/PublishedBuyingGuidePage.jsx';
import PublicComparisonsPage from './pages/ComparisonsPage.jsx';
import ComparisonDetailPage from './pages/ComparisonDetailPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

function App() {
  return (
    <ErrorBoundary>
      <CompareProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<AllProductsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-use" element={<TermsOfUsePage />} />
            <Route path="/affiliate-disclosure" element={<AffiliateDisclosurePage />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/categories" element={<PublicCategoriesPage />} />
            <Route path="/best-sellers" element={<BestSellersPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/buying-guides" element={<PublicBuyingGuidesPage />} />
            <Route path="/buying-guides/:slug" element={<PublishedBuyingGuidePage />} />
            <Route path="/comparisons" element={<PublicComparisonsPage />} />
            <Route path="/comparisons/:slug" element={<ComparisonDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <CompareBar />
        </BrowserRouter>
      </CompareProvider>
    </ErrorBoundary>
  );
}

export default App;
