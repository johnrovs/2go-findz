package com.twogofindz.backend.dto.response;

public record PublicHeroBannerResponse(
        Long id,
        String imageFilename,
        String imageAlt,
        String badge,
        String headline,
        String description,
        String buttonText,
        String buttonLink
) {
}
