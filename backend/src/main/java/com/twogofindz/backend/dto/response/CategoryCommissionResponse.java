package com.twogofindz.backend.dto.response;

import java.math.BigDecimal;

public record CategoryCommissionResponse(Long categoryId, String categoryName, BigDecimal estimatedCommission) {
}
