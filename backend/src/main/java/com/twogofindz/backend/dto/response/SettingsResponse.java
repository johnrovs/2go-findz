package com.twogofindz.backend.dto.response;

public record SettingsResponse(
        String logoImageFilename,
        String heroImageFilename,
        String placeholderImageFilename,
        String tiktokUrl,
        String pinterestUrl,
        String instagramUrl,
        String youtubeUrl,
        String shopBio,
        String heroHeadline,
        String heroDescription,
        String affiliateDisclosure,
        String contactEmail
) {
}
