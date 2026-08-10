import Button from '../Button.jsx';

function BrowseProductsBanner() {
  return (
    <div className="relative overflow-hidden rounded-card bg-navy-900 px-6 py-12 text-center sm:px-12">
      <div className="relative">
        <h2 className="text-section-heading text-white">Browse All Products</h2>
        <p className="mx-auto mt-2 max-w-xl text-subtitle text-white/80">
          Search, filter, and sort our full catalog to find exactly what you need.
        </p>
        <Button variant="primary" to="/products" className="mt-6">
          Browse All Products
        </Button>
      </div>
    </div>
  );
}

export default BrowseProductsBanner;
