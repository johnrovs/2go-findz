package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;

public record ComparisonSummaryResponse(
        Long id,
        String title,
        String slug,
        String description,
        String coverImageFilename,
        Long categoryId,
        String categoryName,
        Boolean published,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
