package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.entity.Visibility;

import java.time.LocalDateTime;
import java.util.List;

public record BuyingGuideResponse(
        Long id,
        String title,
        String slug,
        String excerpt,
        String introduction,
        String coverImageFilename,
        Long categoryId,
        String categoryName,
        String seoTitle,
        String seoDescription,
        Boolean active,
        LocalDateTime scheduledPublishAt,
        List<ProductResponse> recommendedProducts,
        List<BuyingGuideQuickRecommendationResponse> quickRecommendations,
        List<BuyingGuideComparisonSpecResponse> comparisonSpecs,
        List<BuyingGuideRecommendationSectionResponse> recommendationSections,
        List<BuyingGuideFaqResponse> faqs,
        List<BuyingGuideTocEntryResponse> tocEntries,
        String focusKeyword,
        List<String> supportingKeywords,
        String canonicalUrl,
        Visibility visibility,
        Boolean robotsIndex,
        Boolean robotsFollow,
        String openGraphTitle,
        String openGraphDescription,
        String openGraphImageFilename,
        String twitterCardType,
        LocalDateTime publishedAt,
        String publishedBy,
        String updatedBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
