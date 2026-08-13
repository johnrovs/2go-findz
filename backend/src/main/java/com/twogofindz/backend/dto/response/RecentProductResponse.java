package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;

public record RecentProductResponse(
        Long id,
        String name,
        String imageFileName,
        String categoryName,
        boolean active,
        LocalDateTime createdAt,
        long clicks
) {
}
