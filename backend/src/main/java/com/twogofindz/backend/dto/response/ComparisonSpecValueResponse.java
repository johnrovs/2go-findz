package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.entity.SpecTier;

public record ComparisonSpecValueResponse(
        Long productId,
        String value,
        SpecTier tier
) {
}
