package com.twogofindz.backend.dto.response;

import java.math.BigDecimal;

public record ComparisonProductResponse(
        Long id,
        ProductResponse product,
        String badge,
        String recommendation,
        String bestFor,
        String mainStrength,
        String mainWeakness,
        String pros,
        String cons,
        BigDecimal editorsScore
) {
}
