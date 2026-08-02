package com.twogofindz.backend.dto.request;

import com.twogofindz.backend.entity.RecommendationType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record BuyingGuideRecommendationSectionRequest(
        @NotNull(message = "Product id is required.")
        Long productId,

        @NotNull(message = "Recommendation type is required.")
        RecommendationType recommendationType,

        @NotBlank(message = "Section label is required.")
        @Size(max = 100, message = "Section label must be at most 100 characters.")
        String sectionLabel,

        @NotBlank(message = "\"Why we recommend it\" is required.")
        String whyRecommended,

        @NotEmpty(message = "At least one pro is required.")
        @Valid
        List<BuyingGuideRecommendationItemRequest> pros,

        @NotEmpty(message = "At least one con is required.")
        @Valid
        List<BuyingGuideRecommendationItemRequest> cons,

        @NotEmpty(message = "At least one \"best for\" entry is required.")
        @Valid
        List<BuyingGuideRecommendationItemRequest> bestFor
) {
}
