package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.ProductClick;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface ProductClickRepository extends JpaRepository<ProductClick, Long> {

    long countByClickedAtBetween(LocalDateTime from, LocalDateTime to);

    /**
     * One row per calendar day with at least one click in range, grouped and counted at the
     * DB level (native SQL — MySQL-only project, no cross-DB portability concern) so we never
     * pull the full click table into the JVM just to group it in memory.
     */
    @Query(value = """
            select date(clicked_at) as day, count(*) as cnt
            from product_clicks
            where clicked_at between :from and :to
            group by date(clicked_at)
            order by day
            """, nativeQuery = true)
    List<DailyCountProjection> countClicksByDay(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /**
     * Estimated commission = SUM(price * commissionRate / 100) computed entirely in the DB.
     * Returns null (rather than zero) when there are no clicks in range — the service layer
     * coalesces that to BigDecimal.ZERO before rounding.
     */
    @Query("""
            select sum(pc.product.productPrice * pc.product.category.commissionRate / 100)
            from ProductClick pc
            where pc.clickedAt between :from and :to
            """)
    BigDecimal sumEstimatedCommission(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /**
     * Per-category commission sum, grouped in the DB. Categories with zero clicks in range
     * naturally produce no row (rule 6 — omit, don't zero-pad), since there's nothing to
     * group. Ordered by category id for a deterministic response.
     */
    @Query("""
            select pc.product.category.id as categoryId,
                   pc.product.category.productCategoryName as categoryName,
                   sum(pc.product.productPrice * pc.product.category.commissionRate / 100) as commission
            from ProductClick pc
            where pc.clickedAt between :from and :to
            group by pc.product.category.id, pc.product.category.productCategoryName
            order by pc.product.category.id asc
            """)
    List<CategoryCommissionProjection> sumCommissionByCategory(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /**
     * Top-N most clicked products, counted, ordered, and limited entirely in the DB via the
     * supplied {@link Pageable} (e.g. {@code PageRequest.of(0, 10)}). Ties on click count are
     * broken by product id ascending for a deterministic order.
     */
    @Query("""
            select pc.product.id as productId,
                   pc.product.name as productName,
                   count(pc) as clickCount
            from ProductClick pc
            where pc.clickedAt between :from and :to
            group by pc.product.id, pc.product.name
            order by count(pc) desc, pc.product.id asc
            """)
    List<ProductClickCountProjection> findMostClickedProducts(@Param("from") LocalDateTime from,
                                                                @Param("to") LocalDateTime to,
                                                                Pageable pageable);

    interface DailyCountProjection {
        LocalDate getDay();

        Long getCnt();
    }

    interface CategoryCommissionProjection {
        Long getCategoryId();

        String getCategoryName();

        BigDecimal getCommission();
    }

    interface ProductClickCountProjection {
        Long getProductId();

        String getProductName();

        Long getClickCount();
    }
}
