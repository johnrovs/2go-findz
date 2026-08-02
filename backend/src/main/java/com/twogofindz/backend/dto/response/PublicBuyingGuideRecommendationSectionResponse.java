package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.entity.RecommendationType;

import java.util.List;

public record PublicBuyingGuideRecommendationSectionResponse(
        ProductResponse product,
        RecommendationType recommendationType,
        String sectionLabel,
        String whyRecommended,
        List<String> pros,
        List<String> cons,
        List<String> bestFor,
        String badgeName
) {
}
