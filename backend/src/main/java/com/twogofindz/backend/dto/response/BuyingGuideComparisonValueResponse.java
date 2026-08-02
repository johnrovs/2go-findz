package com.twogofindz.backend.dto.response;

public record BuyingGuideComparisonValueResponse(
        Long id,
        ProductResponse product,
        String specificationValue
) {
}
