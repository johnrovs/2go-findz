package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.ProductResponse;
import com.twogofindz.backend.entity.Product;
import org.springframework.stereotype.Component;

@Component
public class ProductMapper {

    public ProductResponse toResponse(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getCategory().getId(),
                product.getCategory().getProductCategoryName(),
                product.getImageFileName(),
                product.getProductPrice(),
                product.getProductLink(),
                product.isTrending(),
                product.isBestSeller(),
                product.isActive(),
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }
}
