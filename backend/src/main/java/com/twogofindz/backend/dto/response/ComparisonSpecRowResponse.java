package com.twogofindz.backend.dto.response;

import java.util.List;

public record ComparisonSpecRowResponse(
        Long id,
        String groupLabel,
        String rowLabel,
        List<ComparisonSpecValueResponse> values
) {
}
