package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.ParsedProductRow;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import com.twogofindz.backend.repository.ProductRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Component
public class ProductImportRowWriter {

    private final ProductCategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public ProductImportRowWriter(ProductCategoryRepository categoryRepository, ProductRepository productRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }

    /**
     * Saves one import row as a new inactive product, auto-creating its category (also inactive,
     * 0.00% commission) if no existing category matches by trim+whitespace-collapsed+case-insensitive
     * name. Runs in its own {@code REQUIRES_NEW} transaction so a failure here rolls back only this
     * row's category-and-product save, never rows already committed earlier in the same import.
     * Categories are fetched fresh (not cached) on every call: since rows are processed strictly
     * sequentially and each row's transaction commits before the next row starts, a category
     * created by an earlier row is already visible here and reused rather than re-created.
     *
     * @return whether a new category was created for this row.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean importRow(ParsedProductRow row, BigDecimal price) {
        String normalizedCategoryName = ProductImportDuplicateChecker.normalizeCategory(row.category());
        ProductCategory category = categoryRepository.findAll().stream()
                .filter(existing -> ProductImportDuplicateChecker
                        .normalizeCategory(existing.getProductCategoryName())
                        .equals(normalizedCategoryName))
                .findFirst()
                .orElse(null);

        boolean createdCategory = false;
        if (category == null) {
            category = categoryRepository.save(ProductCategory.builder()
                    .productCategoryName(row.category().trim())
                    .commissionRate(new BigDecimal("0.00"))
                    .active(false)
                    .build());
            createdCategory = true;
        }

        Product product = Product.builder()
                .name(row.productName().trim())
                .description(row.description() != null ? row.description().trim() : "")
                .category(category)
                .productPrice(price)
                .productLink(row.link().trim())
                .trending(false)
                .bestSeller(false)
                .active(false)
                .brand(row.brand() != null ? row.brand().trim() : null)
                .scheduledPublishAt(null)
                .reviewCount(0)
                .sku(row.sku() != null ? row.sku().trim() : null)
                .build();
        productRepository.save(product);

        return createdCategory;
    }
}
