package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.entity.BuyingGuideSectionKey;

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
        List<PublicBuyingGuideAdviceSectionResponse> adviceSections,
        List<PublicBuyingGuideFaqResponse> faqs,
        List<BuyingGuideSectionKey> visibleSectionOrder
) {
}
