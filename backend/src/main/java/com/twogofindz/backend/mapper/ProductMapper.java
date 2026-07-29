package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.ProductResponse;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.service.SettingsService;
import org.springframework.stereotype.Component;

@Component
public class ProductMapper {

    private final SettingsService settingsService;

    public ProductMapper(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    public ProductResponse toResponse(Product product) {
        String imageFileName = product.getImageFileName() != null
                ? product.getImageFileName()
                : settingsService.getPlaceholderImageFilename();

        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getCategory().getId(),
                product.getCategory().getProductCategoryName(),
                imageFileName,
                product.getProductPrice(),
                product.getProductLink(),
                product.isTrending(),
                product.isBestSeller(),
                product.isActive(),
                product.getCreatedAt(),
                product.getUpdatedAt(),
                product.getBrand(),
                product.getScheduledPublishAt()
        );
    }
}
