package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record BuyingGuideResponse(
        Long id,
        String title,
        String excerpt,
        String content,
        String coverImageFilename,
        Boolean active,
        List<ProductResponse> recommendedProducts,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
