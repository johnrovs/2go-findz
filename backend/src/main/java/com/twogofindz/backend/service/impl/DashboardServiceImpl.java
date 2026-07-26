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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.AbstractMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardServiceImpl implements DashboardService {

    /**
     * Sentinel bounds used when {@code from}/{@code to} are not supplied, so every timestamp-filtered
     * query can always be expressed as a BETWEEN over a concrete range instead of branching on null.
     * Well within MySQL's DATETIME range (0001-01-01 to 9999-12-31), so no overflow risk.
     */
    private static final LocalDateTime MIN_DATETIME = LocalDateTime.of(1970, 1, 1, 0, 0, 0);
    private static final LocalDateTime MAX_DATETIME = LocalDateTime.of(9999, 12, 31, 23, 59, 59);

    private static final DateTimeFormatter YEAR_MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");
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
        BigDecimal estimatedTotalCommission = sumCommission(productClickRepository.findClickDetailsBetween(start, end));

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

        List<DailyCountResponse> viewsByDay = viewsByDay(start, end);
        List<DailyCountResponse> clicksByDay = clicksByDay(start, end);

        List<ProductClickRepository.ClickDetail> clickDetails = productClickRepository.findClickDetailsBetween(start, end);
        List<ProductClickCountResponse> mostClickedProducts = mostClickedProducts(clickDetails);
        List<CategoryCommissionResponse> commissionByCategory = commissionByCategory(clickDetails);

        List<MonthlyCountResponse> productsAddedByMonth = productsAddedByMonth(start, end);

        return new DashboardAnalyticsResponse(
                viewsByDay, clicksByDay, mostClickedProducts, commissionByCategory, productsAddedByMonth);
    }

    private LocalDateTime effectiveFrom(LocalDate from) {
        return from != null ? from.atStartOfDay() : MIN_DATETIME;
    }

    private LocalDateTime effectiveTo(LocalDate to) {
        return to != null ? to.atTime(23, 59, 59) : MAX_DATETIME;
    }

    private List<DailyCountResponse> viewsByDay(LocalDateTime start, LocalDateTime end) {
        Map<LocalDate, Long> counts = websiteViewRepository.findByViewedAtBetween(start, end).stream()
                .collect(Collectors.groupingBy(v -> v.getViewedAt().toLocalDate(), Collectors.counting()));
        return toSortedDailyCounts(counts);
    }

    private List<DailyCountResponse> clicksByDay(LocalDateTime start, LocalDateTime end) {
        Map<LocalDate, Long> counts = productClickRepository.findByClickedAtBetween(start, end).stream()
                .collect(Collectors.groupingBy(c -> c.getClickedAt().toLocalDate(), Collectors.counting()));
        return toSortedDailyCounts(counts);
    }

    private List<DailyCountResponse> toSortedDailyCounts(Map<LocalDate, Long> counts) {
        return counts.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> new DailyCountResponse(e.getKey(), e.getValue()))
                .toList();
    }

    /**
     * Per-click commission contribution: productPrice * (categoryCommissionRate / 100).
     * Dividing by 100 is an exact power-of-ten shift, so no rounding mode is needed here —
     * rounding is only applied once, to the final aggregated totals (rule 9).
     */
    private BigDecimal commissionContribution(ProductClickRepository.ClickDetail detail) {
        return detail.getProductPrice().multiply(detail.getCommissionRate()).divide(BigDecimal.valueOf(100));
    }

    private BigDecimal sumCommission(List<ProductClickRepository.ClickDetail> details) {
        BigDecimal total = BigDecimal.ZERO;
        for (ProductClickRepository.ClickDetail detail : details) {
            total = total.add(commissionContribution(detail));
        }
        return total.setScale(2, RoundingMode.HALF_UP);
    }

    private List<ProductClickCountResponse> mostClickedProducts(List<ProductClickRepository.ClickDetail> details) {
        Map<Map.Entry<Long, String>, Long> counts = details.stream()
                .collect(Collectors.groupingBy(
                        d -> new AbstractMap.SimpleEntry<>(d.getProductId(), d.getProductName()),
                        LinkedHashMap::new,
                        Collectors.counting()));

        return counts.entrySet().stream()
                .sorted(Map.Entry.<Map.Entry<Long, String>, Long>comparingByValue().reversed())
                .limit(MOST_CLICKED_LIMIT)
                .map(e -> new ProductClickCountResponse(e.getKey().getKey(), e.getKey().getValue(), e.getValue()))
                .toList();
    }

    private List<CategoryCommissionResponse> commissionByCategory(List<ProductClickRepository.ClickDetail> details) {
        Map<Long, String> categoryNames = new LinkedHashMap<>();
        Map<Long, BigDecimal> commissionByCategoryId = new LinkedHashMap<>();

        for (ProductClickRepository.ClickDetail detail : details) {
            categoryNames.putIfAbsent(detail.getCategoryId(), detail.getCategoryName());
            commissionByCategoryId.merge(detail.getCategoryId(), commissionContribution(detail), BigDecimal::add);
        }

        return commissionByCategoryId.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> new CategoryCommissionResponse(
                        e.getKey(), categoryNames.get(e.getKey()), e.getValue().setScale(2, RoundingMode.HALF_UP)))
                .toList();
    }

    private List<MonthlyCountResponse> productsAddedByMonth(LocalDateTime start, LocalDateTime end) {
        Map<String, Long> counts = productRepository.findByCreatedAtBetween(start, end).stream()
                .collect(Collectors.groupingBy(
                        p -> p.getCreatedAt().format(YEAR_MONTH_FORMATTER),
                        Collectors.counting()));

        return counts.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> new MonthlyCountResponse(e.getKey(), e.getValue()))
                .toList();
    }
}
