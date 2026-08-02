package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record BuyingGuideQuickRecommendationRequest(
        @NotNull(message = "Product id is required.")
        Long productId,

        @NotBlank(message = "Badge name is required.")
        @Size(max = 60, message = "Badge name must be at most 60 characters.")
        String badgeName
) {
}
