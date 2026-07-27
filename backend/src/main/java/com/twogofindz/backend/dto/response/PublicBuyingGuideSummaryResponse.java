package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;

public record PublicBuyingGuideSummaryResponse(
        Long id,
        String title,
        String excerpt,
        String coverImageFilename,
        LocalDateTime createdAt
) {
}
