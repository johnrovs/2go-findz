package com.twogofindz.backend.dto.response;

public record BuyingGuideQuickRecommendationResponse(
        Long id,
        ProductResponse product,
        String badgeName
) {
}
