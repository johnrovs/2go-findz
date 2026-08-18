import ProductCatalogPanel from './ProductCatalogPanel.jsx';
import SelectedProductsPanel from './SelectedProductsPanel.jsx';

function ProductsStep({ selectedProducts, onSelectedProductsChange, categories }) {
  function handleAdd(product) {
    onSelectedProductsChange([...selectedProducts, product]);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ProductCatalogPanel selectedProducts={selectedProducts} onAdd={handleAdd} categories={categories} />
      <SelectedProductsPanel selectedProducts={selectedProducts} onChange={onSelectedProductsChange} />
    </div>
  );
}

export default ProductsStep;
