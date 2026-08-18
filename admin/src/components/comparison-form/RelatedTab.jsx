import ProductPicker from '../ProductPicker.jsx';
import ComparisonPicker from '../ComparisonPicker.jsx';

function RelatedTab({
  relatedProducts,
  onRelatedProductsChange,
  relatedComparisons,
  onRelatedComparisonsChange,
  excludeComparisonId,
}) {
  return (
    <div className="space-y-8">
      <ProductPicker selectedProducts={relatedProducts} onChange={onRelatedProductsChange} label="Related Products" />
      <ComparisonPicker
        selectedComparisons={relatedComparisons}
        onChange={onRelatedComparisonsChange}
        excludeId={excludeComparisonId}
      />
    </div>
  );
}

export default RelatedTab;
