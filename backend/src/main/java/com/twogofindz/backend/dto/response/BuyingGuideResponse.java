package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record BuyingGuideResponse(
        Long id,
        String title,
        String slug,
        String excerpt,
        String introduction,
        String coverImageFilename,
        Long categoryId,
        String categoryName,
        String seoTitle,
        String seoDescription,
        Boolean active,
        LocalDateTime scheduledPublishAt,
        List<ProductResponse> recommendedProducts,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
