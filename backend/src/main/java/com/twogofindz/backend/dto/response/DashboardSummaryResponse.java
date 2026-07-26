package com.twogofindz.backend.dto.response;

import java.math.BigDecimal;

public record DashboardSummaryResponse(
        long totalViews,
        long totalClicks,
        BigDecimal estimatedTotalCommission,
        long totalProducts,
        long totalCategories,
        long trendingCount,
        long bestSellerCount
) {
}
