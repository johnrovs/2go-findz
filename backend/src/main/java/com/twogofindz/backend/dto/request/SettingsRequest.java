package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.Email;

public record SettingsRequest(
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
        @Email(message = "Contact email must be a valid email address.") String contactEmail
) {
}
