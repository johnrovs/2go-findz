import BrowseProductsPage from './BrowseProductsPage.jsx';

function BestSellersPage() {
  return (
    <BrowseProductsPage
      title="Best Sellers"
      description="Our most popular picks."
      breadcrumbLabel="Best Sellers"
      bestSeller
    />
  );
}

export default BestSellersPage;
