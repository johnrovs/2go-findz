import BrowseProductsPage from './BrowseProductsPage.jsx';

function TrendingPage() {
  return (
    <BrowseProductsPage
      title="Trending Finds"
      description="See what's trending right now."
      breadcrumbLabel="Trending"
      trending
    />
  );
}

export default TrendingPage;
