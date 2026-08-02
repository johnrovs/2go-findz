package com.twogofindz.backend.dto.response;

import java.util.List;

public record BuyingGuideComparisonSpecResponse(
        Long id,
        String specificationName,
        List<BuyingGuideComparisonValueResponse> values
) {
}
