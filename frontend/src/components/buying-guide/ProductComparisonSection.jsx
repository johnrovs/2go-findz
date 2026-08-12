import ComparisonTable from './ComparisonTable.jsx';
import { isSupportedAmazonUrl, getAmazonMarketplace } from '../../utils/amazonLink.js';

function ProductComparisonSection({ comparisonTable, number, guideId, onProductClick }) {
  if (!comparisonTable || comparisonTable.rows.length === 0) return null;

  const hasPrice = comparisonTable.specificationNames.some((name) => /price/i.test(name));

  return (
    <section aria-labelledby="product-comparison-heading" className="scroll-mt-24">
      <h2 id="product-comparison-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
        {number}. Product Comparison
      </h2>
      <ComparisonTable
        comparisonTable={comparisonTable}
        renderProductName={(product) =>
          isSupportedAmazonUrl(product.productLink) ? (
            <a
              href={product.productLink}
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
              onClick={() =>
                onProductClick({
                  guideId,
                  productId: product.id,
                  section: 'product_comparison',
                  marketplace: getAmazonMarketplace(product.productLink),
                })
              }
              className="font-semibold text-primary hover:underline"
            >
              {product.name}
            </a>
          ) : (
            product.name
          )
        }
      />
      {hasPrice && <p className="mt-2 text-xs text-muted">* Prices and availability may change after publication.</p>}
    </section>
  );
}

export default ProductComparisonSection;
