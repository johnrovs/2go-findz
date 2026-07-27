package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

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
        @NotBlank(message = "Affiliate disclosure is required.") String affiliateDisclosure,
        @Email(message = "Contact email must be a valid email address.") String contactEmail
) {
}
