package com.twogofindz.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public record BuyingGuideRequest(
        @NotBlank(message = "Title is required.")
        @Size(max = 200, message = "Title must be at most 200 characters.")
        String title,

        @Pattern(regexp = "^$|^[a-z0-9]+(-[a-z0-9]+)*$", message = "Slug must be lowercase letters, numbers, and hyphens only.")
        @Size(max = 220, message = "Slug must be at most 220 characters.")
        String slug,

        @NotBlank(message = "Excerpt is required.")
        @Size(max = 500, message = "Excerpt must be at most 500 characters.")
        String excerpt,

        @NotBlank(message = "Introduction is required.")
        String introduction,

        @Size(max = 255, message = "Cover image filename must be at most 255 characters.")
        String coverImageFilename,

        @NotNull(message = "Category is required.")
        Long categoryId,

        @Size(max = 70, message = "SEO title must be at most 70 characters.")
        String seoTitle,

        @Size(max = 200, message = "SEO description must be at most 200 characters.")
        String seoDescription,

        @NotNull(message = "Active flag is required.")
        Boolean active,

        LocalDateTime scheduledPublishAt,

        @NotNull(message = "Recommended products list is required.")
        List<Long> recommendedProductIds,

        @NotNull(message = "Quick recommendations list is required.")
        @Valid
        List<BuyingGuideQuickRecommendationRequest> quickRecommendations,

        @NotNull(message = "Comparison specs list is required.")
        @Valid
        List<BuyingGuideComparisonSpecRequest> comparisonSpecs,

        @NotNull(message = "Recommendation sections list is required.")
        @Valid
        List<BuyingGuideRecommendationSectionRequest> recommendationSections,

        @NotNull(message = "FAQs list is required.")
        @Valid
        List<BuyingGuideFaqRequest> faqs,

        @NotNull(message = "Table of contents entries list is required.")
        @Valid
        List<BuyingGuideTocEntryRequest> tocEntries
) {
}
