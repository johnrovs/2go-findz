package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;

public record PublicComparisonSummaryResponse(
        Long id,
        String title,
        String slug,
        String description,
        String coverImageFilename,
        String categoryName,
        LocalDateTime createdAt
) {
}
