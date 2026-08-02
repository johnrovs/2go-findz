package com.twogofindz.backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProductResponse(
        Long id,
        String name,
        String description,
        Long categoryId,
        String categoryName,
        String imageFileName,
        BigDecimal productPrice,
        String productLink,
        boolean trending,
        boolean bestSeller,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String brand,
        LocalDateTime scheduledPublishAt,
        BigDecimal rating,
        int reviewCount
) {
}
