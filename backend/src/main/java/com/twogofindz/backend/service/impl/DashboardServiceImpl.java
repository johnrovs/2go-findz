package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.response.CategoryClickCountResponse;
import com.twogofindz.backend.dto.response.CategoryCommissionResponse;
import com.twogofindz.backend.dto.response.DailyCountResponse;
import com.twogofindz.backend.dto.response.DashboardAnalyticsResponse;
import com.twogofindz.backend.dto.response.DashboardSummaryResponse;
import com.twogofindz.backend.dto.response.LatestGuideResponse;
import com.twogofindz.backend.dto.response.MonthlyCountResponse;
import com.twogofindz.backend.dto.response.ProductClickCountResponse;
import com.twogofindz.backend.dto.response.RecentProductResponse;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.Visibility;
import com.twogofindz.backend.repository.BuyingGuideRepository;
import com.twogofindz.backend.repository.BuyingGuideViewRepository;
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
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
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

    private static final int MOST_CLICKED_LIMIT = 10;
    private static final int TOP_CATEGORIES_LIMIT = 5;

    private final WebsiteViewRepository websiteViewRepository;
    private final ProductClickRepository productClickRepository;
    private final ProductRepository productRepository;
    private final ProductCategoryRepository productCategoryRepository;
    private final BuyingGuideRepository buyingGuideRepository;
    private final BuyingGuideViewRepository buyingGuideViewRepository;

    public DashboardServiceImpl(WebsiteViewRepository websiteViewRepository,
                                 ProductClickRepository productClickRepository,
                                 ProductRepository productRepository,
                                 ProductCategoryRepository productCategoryRepository,
                                 BuyingGuideRepository buyingGuideRepository,
                                 BuyingGuideViewRepository buyingGuideViewRepository) {
        this.websiteViewRepository = websiteViewRepository;
        this.productClickRepository = productClickRepository;
        this.productRepository = productRepository;
        this.productCategoryRepository = productCategoryRepository;
        this.buyingGuideRepository = buyingGuideRepository;
        this.buyingGuideViewRepository = buyingGuideViewRepository;
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

        // Same all-time, non-range-filtered convention as totalProducts/totalCategories (Rule 3/4).
        long publishedGuideCount = buyingGuideRepository.countByActiveTrueAndVisibility(Visibility.PUBLIC);

        // New: all-time counts of things that need admin attention, same non-range-filtered
        // convention as totalProducts/totalCategories/publishedGuideCount.
        long draftProductCount = productRepository.countByActiveFalse();
        long draftGuideCount = buyingGuideRepository.countByActiveFalse();
        long emptyCategoryCount = productCategoryRepository.countCategoriesWithNoActiveProducts();

        return new DashboardSummaryResponse(
                totalViews, totalClicks, estimatedTotalCommission,
                totalProducts, totalCategories, trendingCount, bestSellerCount, publishedGuideCount,
                draftProductCount, draftGuideCount, emptyCategoryCount);
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

        List<CategoryClickCountResponse> topCategories = productClickRepository
                .countClicksByCategory(start, end, PageRequest.of(0, TOP_CATEGORIES_LIMIT)).stream()
                .map(p -> new CategoryClickCountResponse(p.getCategoryId(), p.getCategoryName(), p.getClickCount()))
                .toList();

        List<Product> recentProductEntities = productRepository.findTop5ByOrderByCreatedAtDesc();
        List<Long> recentProductIds = recentProductEntities.stream().map(Product::getId).toList();
        Map<Long, Long> clicksByProductId = recentProductIds.isEmpty()
                ? Map.of()
                : productClickRepository.countClicksByProductIdsBetween(recentProductIds, start, end).stream()
                        .collect(Collectors.toMap(
                                ProductClickRepository.ProductIdClickCountProjection::getProductId,
                                ProductClickRepository.ProductIdClickCountProjection::getClickCount));
        List<RecentProductResponse> recentProducts = recentProductEntities.stream()
                .map(p -> new RecentProductResponse(
                        p.getId(), p.getName(), p.getImageFileName(), p.getCategory().getProductCategoryName(),
                        p.isActive(), p.getCreatedAt(), clicksByProductId.getOrDefault(p.getId(), 0L)))
                .toList();

        List<BuyingGuide> latestGuideEntities = buyingGuideRepository.findTop5ByOrderByCreatedAtDesc();
        List<Long> latestGuideIds = latestGuideEntities.stream().map(BuyingGuide::getId).toList();
        Map<Long, Long> viewsByGuideId = latestGuideIds.isEmpty()
                ? Map.of()
                : buyingGuideViewRepository.countViewsByGuideIdsBetween(latestGuideIds, start, end).stream()
                        .collect(Collectors.toMap(
                                BuyingGuideViewRepository.GuideIdViewCountProjection::getGuideId,
                                BuyingGuideViewRepository.GuideIdViewCountProjection::getViewCount));
        List<LatestGuideResponse> latestGuides = latestGuideEntities.stream()
                .map(g -> new LatestGuideResponse(
                        g.getId(), g.getTitle(), g.getCoverImageFilename(),
                        g.getActive(), g.getCreatedAt(), viewsByGuideId.getOrDefault(g.getId(), 0L)))
                .toList();

        return new DashboardAnalyticsResponse(
                viewsByDay, clicksByDay, mostClickedProducts, commissionByCategory, productsAddedByMonth,
                topCategories, recentProducts, latestGuides);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportSummaryCsv(LocalDate from, LocalDate to) {
        DashboardSummaryResponse summary = getSummary(from, to);
        DashboardAnalyticsResponse analytics = getAnalytics(from, to);

        DateTimeFormatter dateLabelFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US);
        String fromLabel = from != null ? from.format(dateLabelFormatter) : "All time";
        String toLabel = to != null ? to.format(dateLabelFormatter) : "All time";

        double ctr = summary.totalViews() == 0 ? 0
                : Math.round((double) summary.totalClicks() / summary.totalViews() * 1000) / 10.0;
        String ctrLabel = ctr == Math.floor(ctr) ? String.format("%d%%", (long) ctr) : String.format("%.1f%%", ctr);

        StringBuilder csv = new StringBuilder();
        csv.append("Metric,Value\n");
        csv.append("Date Range,\"").append(fromLabel).append(" - ").append(toLabel).append("\"\n");
        csv.append("Total Views,").append(summary.totalViews()).append('\n');
        csv.append("Total Clicks,").append(summary.totalClicks()).append('\n');
        csv.append("Total Products,").append(summary.totalProducts()).append('\n');
        csv.append("Published Guides,").append(summary.publishedGuideCount()).append('\n');
        csv.append("Avg. Click Through Rate,").append(ctrLabel).append('\n');
        csv.append('\n');
        csv.append("Date,Views,Clicks\n");

        Map<LocalDate, Long> viewsByDate = analytics.viewsByDay().stream()
                .collect(Collectors.toMap(DailyCountResponse::date, DailyCountResponse::count));
        Map<LocalDate, Long> clicksByDate = analytics.clicksByDay().stream()
                .collect(Collectors.toMap(DailyCountResponse::date, DailyCountResponse::count));
        Set<LocalDate> allDates = new TreeSet<>();
        allDates.addAll(viewsByDate.keySet());
        allDates.addAll(clicksByDate.keySet());
        for (LocalDate date : allDates) {
            csv.append(date).append(',')
                    .append(viewsByDate.getOrDefault(date, 0L)).append(',')
                    .append(clicksByDate.getOrDefault(date, 0L)).append('\n');
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
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
