package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.CategoryResponse;
import com.twogofindz.backend.dto.response.PublicCategoryResponse;
import com.twogofindz.backend.entity.ProductCategory;
import org.springframework.stereotype.Component;

@Component
public class CategoryMapper {

    public CategoryResponse toResponse(ProductCategory category) {
        return new CategoryResponse(
                category.getId(),
                category.getProductCategoryName(),
                category.getCommissionRate(),
                category.getCreatedAt(),
                category.getUpdatedAt()
        );
    }

    public PublicCategoryResponse toPublicResponse(ProductCategory category) {
        return new PublicCategoryResponse(category.getId(), category.getProductCategoryName());
    }
}
