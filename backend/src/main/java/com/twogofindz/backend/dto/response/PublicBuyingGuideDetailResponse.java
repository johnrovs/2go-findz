package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record PublicBuyingGuideDetailResponse(
        Long id,
        String title,
        String content,
        String coverImageFilename,
        LocalDateTime createdAt,
        List<ProductResponse> recommendedProducts
) {
}
