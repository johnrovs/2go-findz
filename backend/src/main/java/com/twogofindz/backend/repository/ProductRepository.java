package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    boolean existsByCategoryId(Long categoryId);

    long countByActiveTrueAndTrendingTrue();

    long countByActiveTrueAndBestSellerTrue();

    List<Product> findAllByIdInAndActiveTrue(List<Long> ids);

    List<Product> findByActiveFalseAndScheduledPublishAtLessThanEqual(LocalDateTime now);

    @Query("SELECT DISTINCT p.brand FROM Product p WHERE p.brand IS NOT NULL AND p.brand <> '' ORDER BY p.brand")
    List<String> findDistinctBrands();

    /**
     * One row per calendar month with at least one product created in range, grouped and
     * counted at the DB level (native SQL — MySQL-only project) rather than fetching every
     * product row into the JVM just to group it in memory.
     */
    @Query(value = """
            select date_format(created_at, '%Y-%m') as ym, count(*) as cnt
            from products
            where created_at between :from and :to
            group by date_format(created_at, '%Y-%m')
            order by ym
            """, nativeQuery = true)
    List<MonthlyCountProjection> countProductsByMonth(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    interface MonthlyCountProjection {
        String getYm();

        Long getCnt();
    }
}
