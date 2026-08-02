package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BuyingGuideRecommendationItemRequest(
        @NotBlank(message = "Content is required.")
        @Size(max = 300, message = "Content must be at most 300 characters.")
        String content
) {
}
