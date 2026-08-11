import BrowseProductListItem from './BrowseProductListItem.jsx';

function BrowseProductList({ products }) {
  return (
    <div className="flex flex-col gap-3">
      {products.map((product) => (
        <BrowseProductListItem key={product.id} product={product} />
      ))}
    </div>
  );
}

export default BrowseProductList;
