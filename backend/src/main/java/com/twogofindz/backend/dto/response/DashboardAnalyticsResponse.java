package com.twogofindz.backend.dto.response;

import java.util.List;

public record DashboardAnalyticsResponse(
        List<DailyCountResponse> viewsByDay,
        List<DailyCountResponse> clicksByDay,
        List<ProductClickCountResponse> mostClickedProducts,
        List<CategoryCommissionResponse> commissionByCategory,
        List<MonthlyCountResponse> productsAddedByMonth,
        List<CategoryClickCountResponse> topCategories,
        List<RecentProductResponse> recentProducts,
        List<LatestGuideResponse> latestGuides
) {
}
