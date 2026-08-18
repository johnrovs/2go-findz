import EntityPicker from './EntityPicker.jsx';
import { searchProducts } from '../services/adminProductService.js';

function searchProductsForPicker(query) {
  return searchProducts({ search: query, size: 5 }).then((data) => data.content);
}

function getProductLabel(product) {
  return product.name;
}

function ProductPicker({ selectedProducts, onChange, label = 'Recommended Products' }) {
  return (
    <EntityPicker
      label={label}
      inputId="productSearch"
      searchPlaceholder="Search products to add..."
      selectedItems={selectedProducts}
      onChange={onChange}
      search={searchProductsForPicker}
      getItemLabel={getProductLabel}
    />
  );
}

export default ProductPicker;
