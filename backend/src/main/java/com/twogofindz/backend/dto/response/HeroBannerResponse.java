package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;

public record HeroBannerResponse(
        Long id,
        String imageFilename,
        String imageAlt,
        String badge,
        String headline,
        String description,
        String buttonText,
        String buttonLink,
        Integer displayOrder,
        Boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
