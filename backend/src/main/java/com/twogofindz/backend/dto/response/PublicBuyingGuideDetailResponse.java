package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.entity.Visibility;

import java.time.LocalDateTime;
import java.util.List;

public record PublicBuyingGuideDetailResponse(
        Long id,
        String title,
        String slug,
        String excerpt,
        String introduction,
        String coverImageFilename,
        String categoryName,
        String seoTitle,
        String seoDescription,
        LocalDateTime createdAt,
        List<ProductResponse> recommendedProducts,
        List<PublicBuyingGuideQuickRecommendationResponse> quickRecommendations,
        PublicBuyingGuideComparisonTableResponse comparisonTable,
        PublicBuyingGuideRecommendationSectionResponse topPick,
        List<PublicBuyingGuideRecommendationSectionResponse> runnerUps,
        List<PublicBuyingGuideFaqResponse> faqs,
        List<PublicBuyingGuideTocEntryResponse> tocEntries,
        String focusKeyword,
        String canonicalUrl,
        Visibility visibility,
        boolean robotsIndex,
        boolean robotsFollow,
        String openGraphTitle,
        String openGraphDescription,
        String openGraphImageFilename,
        String twitterCardType,
        LocalDateTime publishedAt,
        LocalDateTime updatedAt
) {
}
