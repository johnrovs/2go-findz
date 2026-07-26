package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.ProductCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductCategoryRepository extends JpaRepository<ProductCategory, Long> {
    boolean existsByProductCategoryNameIgnoreCase(String name);
    Optional<ProductCategory> findByProductCategoryNameIgnoreCase(String name);
}
