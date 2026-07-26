package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    boolean existsByCategoryId(Long categoryId);

    long countByActiveTrueAndTrendingTrue();

    long countByActiveTrueAndBestSellerTrue();

    List<Product> findByCreatedAtBetween(LocalDateTime from, LocalDateTime to);
}
