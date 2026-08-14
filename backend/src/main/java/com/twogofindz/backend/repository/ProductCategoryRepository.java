package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.ProductCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface ProductCategoryRepository extends JpaRepository<ProductCategory, Long> {
    boolean existsByProductCategoryNameIgnoreCase(String name);
    Optional<ProductCategory> findByProductCategoryNameIgnoreCase(String name);

    /**
     * Categories with zero active products — either no products at all, or only inactive ones.
     * Cheap to compute directly (categories are low-volume, no pagination needed).
     */
    @Query("""
            select count(c) from ProductCategory c
            where not exists (
                select 1 from Product p where p.category = c and p.active = true
            )
            """)
    long countCategoriesWithNoActiveProducts();
}
