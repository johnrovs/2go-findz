package com.twogofindz.backend.dto.response;

import java.util.List;

public record PublicBuyingGuideComparisonRowResponse(
        ProductResponse product,
        List<String> specificationValues
) {
}
