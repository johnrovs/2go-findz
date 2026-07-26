package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.ProductClick;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface ProductClickRepository extends JpaRepository<ProductClick, Long> {

    long countByClickedAtBetween(LocalDateTime from, LocalDateTime to);

    List<ProductClick> findByClickedAtBetween(LocalDateTime from, LocalDateTime to);

    /**
     * Flat per-click projection joining the clicked product and its category, used by
     * DashboardServiceImpl to aggregate commission-by-category and most-clicked-products
     * without triggering lazy-loading of the Product/ProductCategory associations.
     */
    @Query("""
            select pc.product.id as productId,
                   pc.product.name as productName,
                   pc.product.productPrice as productPrice,
                   pc.product.category.id as categoryId,
                   pc.product.category.productCategoryName as categoryName,
                   pc.product.category.commissionRate as commissionRate
            from ProductClick pc
            where pc.clickedAt between :from and :to
            """)
    List<ClickDetail> findClickDetailsBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    interface ClickDetail {
        Long getProductId();

        String getProductName();

        BigDecimal getProductPrice();

        Long getCategoryId();

        String getCategoryName();

        BigDecimal getCommissionRate();
    }
}
