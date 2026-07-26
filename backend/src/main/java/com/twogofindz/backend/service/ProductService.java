package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.ProductRequest;
import com.twogofindz.backend.dto.response.ProductResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;

public interface ProductService {
    ProductResponse create(ProductRequest request);
    ProductResponse update(Long id, ProductRequest request);
    ProductResponse getById(Long id);
    ProductResponse getActiveById(Long id);
    void softDelete(Long id);
    Page<ProductResponse> search(
            String term, Long categoryId, Boolean trending, Boolean bestSeller, Boolean active,
            BigDecimal minPrice, BigDecimal maxPrice, Pageable pageable);
}
