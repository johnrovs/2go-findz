package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.response.CategoryCommissionResponse;
import com.twogofindz.backend.dto.response.DailyCountResponse;
import com.twogofindz.backend.dto.response.DashboardAnalyticsResponse;
import com.twogofindz.backend.dto.response.DashboardSummaryResponse;
import com.twogofindz.backend.dto.response.MonthlyCountResponse;
import com.twogofindz.backend.dto.response.ProductClickCountResponse;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import com.twogofindz.backend.repository.ProductClickRepository;
import com.twogofindz.backend.repository.ProductRepository;
import com.twogofindz.backend.repository.WebsiteViewRepository;
import com.twogofindz.backend.service.DashboardService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class DashboardServiceImpl implements DashboardService {

    /**
     * Sentinel bounds used when {@code from}/{@code to} are not supplied, so every timestamp-filtered
     * query can always be expressed as a BETWEEN over a concrete range instead of branching on null.
     * Well within MySQL's DATETIME range (0001-01-01 to 9999-12-31), so no overflow risk.
     */
    private static final LocalDateTime MIN_DATETIME = LocalDateTime.of(1970, 1, 1, 0, 0, 0);
    private static final LocalDateTime MAX_DATETIME = LocalDateTime.of(9999, 12, 31, 23, 59, 59);

    private static final int MOST_CLICKED_LIMIT = 10;

    private final WebsiteViewRepository websiteViewRepository;
    private final ProductClickRepository productClickRepository;
    private final ProductRepository productRepository;
    private final ProductCategoryRepository productCategoryRepository;

    public DashboardServiceImpl(WebsiteViewRepository websiteViewRepository,
                                 ProductClickRepository productClickRepository,
                                 ProductRepository productRepository,
                                 ProductCategoryRepository productCategoryRepository) {
        this.websiteViewRepository = websiteViewRepository;
        this.productClickRepository = productClickRepository;
        this.productRepository = productRepository;
        this.productCategoryRepository = productCategoryRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary(LocalDate from, LocalDate to) {
        LocalDateTime start = effectiveFrom(from);
        LocalDateTime end = effectiveTo(to);

        long totalViews = websiteViewRepository.countByViewedAtBetween(start, end);
        long totalClicks = productClickRepository.countByClickedAtBetween(start, end);
        BigDecimal estimatedTotalCommission = round(productClickRepository.sumEstimatedCommission(start, end));

        // Rules 3/4: totals reflect every product/category ever created, never filtered by the range.
        long totalProducts = productRepository.count();
        long totalCategories = productCategoryRepository.count();

        // Rule 5: trending/best-seller reflect current storefront state (active products only), never filtered by the range.
        long trendingCount = productRepository.countByActiveTrueAndTrendingTrue();
        long bestSellerCount = productRepository.countByActiveTrueAndBestSellerTrue();

        return new DashboardSummaryResponse(
                totalViews, totalClicks, estimatedTotalCommission,
                totalProducts, totalCategories, trendingCount, bestSellerCount);
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardAnalyticsResponse getAnalytics(LocalDate from, LocalDate to) {
        LocalDateTime start = effectiveFrom(from);
        LocalDateTime end = effectiveTo(to);

        List<DailyCountResponse> viewsByDay = websiteViewRepository.countViewsByDay(start, end).stream()
                .map(p -> new DailyCountResponse(p.getDay(), p.getCnt()))
                .toList();

        List<DailyCountResponse> clicksByDay = productClickRepository.countClicksByDay(start, end).stream()
                .map(p -> new DailyCountResponse(p.getDay(), p.getCnt()))
                .toList();

        List<ProductClickCountResponse> mostClickedProducts = productClickRepository
                .findMostClickedProducts(start, end, PageRequest.of(0, MOST_CLICKED_LIMIT)).stream()
                .map(p -> new ProductClickCountResponse(p.getProductId(), p.getProductName(), p.getClickCount()))
                .toList();

        List<CategoryCommissionResponse> commissionByCategory = productClickRepository
                .sumCommissionByCategory(start, end).stream()
                .map(p -> new CategoryCommissionResponse(
                        p.getCategoryId(), p.getCategoryName(), p.getCommission().setScale(2, RoundingMode.HALF_UP)))
                .toList();

        List<MonthlyCountResponse> productsAddedByMonth = productRepository.countProductsByMonth(start, end).stream()
                .map(p -> new MonthlyCountResponse(p.getYm(), p.getCnt()))
                .toList();

        return new DashboardAnalyticsResponse(
                viewsByDay, clicksByDay, mostClickedProducts, commissionByCategory, productsAddedByMonth);
    }

    private LocalDateTime effectiveFrom(LocalDate from) {
        return from != null ? from.atStartOfDay() : MIN_DATETIME;
    }

    private LocalDateTime effectiveTo(LocalDate to) {
        return to != null ? to.atTime(23, 59, 59) : MAX_DATETIME;
    }

    /**
     * Rule 9: round once, at the end, HALF_UP to 2dp. {@code sum(...)} returns null (rather than
     * zero) when there are no matching rows, so that's coalesced to zero first.
     */
    private BigDecimal round(BigDecimal value) {
        return (value != null ? value : BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }
}
