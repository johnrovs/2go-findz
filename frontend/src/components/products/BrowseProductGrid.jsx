import BrowseProductCard from './BrowseProductCard.jsx';

function BrowseProductGrid({ products }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {products.map((product) => (
        <BrowseProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default BrowseProductGrid;
