package com.twogofindz.backend.dto.response;

import java.util.List;

public record PublicBuyingGuideComparisonTableResponse(
        List<String> specificationNames,
        List<PublicBuyingGuideComparisonRowResponse> rows
) {
}
