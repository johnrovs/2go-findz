package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.entity.RecommendationType;

import java.util.List;

public record BuyingGuideRecommendationSectionResponse(
        Long id,
        ProductResponse product,
        RecommendationType recommendationType,
        String sectionLabel,
        String whyRecommended,
        List<BuyingGuideRecommendationItemResponse> pros,
        List<BuyingGuideRecommendationItemResponse> cons,
        List<BuyingGuideRecommendationItemResponse> bestFor
) {
}
