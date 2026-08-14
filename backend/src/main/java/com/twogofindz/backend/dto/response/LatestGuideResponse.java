package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;

public record LatestGuideResponse(
        Long id,
        String title,
        String coverImageFilename,
        boolean active,
        LocalDateTime createdAt,
        long views
) {
}
