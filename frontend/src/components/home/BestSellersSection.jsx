import CompactProductRow from './CompactProductRow.jsx';

function BestSellersSection({ products }) {
  if (products.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {products.slice(0, 3).map((product) => (
        <CompactProductRow key={product.id} product={product} />
      ))}
    </div>
  );
}

export default BestSellersSection;
