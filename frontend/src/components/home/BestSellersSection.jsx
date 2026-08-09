import CompactProductRow from './CompactProductRow.jsx';

function BestSellersSection({ products }) {
  if (products.length === 0) return null;

  return (
    <div className="divide-y divide-border">
      {products.slice(0, 3).map((product) => (
        <CompactProductRow key={product.id} product={product} />
      ))}
    </div>
  );
}

export default BestSellersSection;
