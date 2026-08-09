package com.twogofindz.backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CategoryResponse(
        Long id,
        String productCategoryName,
        BigDecimal commissionRate,
        String imageFileName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
