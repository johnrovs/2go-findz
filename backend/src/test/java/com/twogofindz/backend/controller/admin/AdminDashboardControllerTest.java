package com.twogofindz.backend.controller.admin;

import com.fasterxml.jackson.databind.JsonNode;
import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.request.CategoryRequest;
import com.twogofindz.backend.dto.request.ProductRequest;
import com.twogofindz.backend.entity.Visibility;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminDashboardControllerTest extends AbstractIntegrationTest {

    @Test
    void analytics_computesEstimatedCommission_forExactlyThreeClicks() throws Exception {
        String token = adminToken();

        // 10.00% commission rate category
        var categoryResult = mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new com.twogofindz.backend.dto.request.CategoryRequest(
                                        "Commission Math Category", new BigDecimal("10.00"), null, true))))
                .andReturn();
        Long categoryId = objectMapper.readTree(categoryResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // $50.00 product
        var productResult = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ProductRequest(
                                "Commission Math Product", "For commission math.", categoryId, null,
                                new BigDecimal("50.00"), "https://amazon.com/dp/commissionmath",
                                false, false, true, null, null,
                null, null, null))))
                .andReturn();
        Long productId = objectMapper.readTree(productResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Exactly 3 tracked clicks
        for (int i = 0; i < 3; i++) {
            mockMvc.perform(post("/api/public/products/{id}/click", productId));
        }

        // Expected: 50.00 * (10.00 / 100) * 3 = 15.00
        mockMvc.perform(get("/api/admin/dashboard/analytics")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.commissionByCategory[?(@.categoryName == 'Commission Math Category')].estimatedCommission")
                        .value(org.hamcrest.Matchers.contains(15.00)));
    }

    @Test
    void summary_returns401_withoutToken() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard/summary"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void summary_totalProducts_includesInactive_butTrendingAndBestSeller_excludeIt() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Summary Swap Trap Category");

        JsonNode before = fetchSummaryData(token, null, null);
        long productsBefore = before.path("totalProducts").asLong();
        long trendingBefore = before.path("trendingCount").asLong();
        long bestSellerBefore = before.path("bestSellerCount").asLong();

        // Active, trending, best-seller product: counts toward totalProducts AND trending/bestSeller.
        createProductId(token, "Swap Trap Product A", categoryId, new BigDecimal("10.00"), true, true, true);

        // Active, trending, best-seller product that is then soft-deleted (active=false): must
        // still count toward totalProducts (rule 3 — never filtered, includes soft-deleted) but
        // must NOT count toward trending/bestSeller (rule 5 — active-only), even though its
        // trending/bestSeller flags remain true. This is exactly the "easy to swap" trap.
        Long productBId = createProductId(token, "Swap Trap Product B", categoryId, new BigDecimal("10.00"), true, true, true);
        mockMvc.perform(delete("/api/admin/products/{id}", productBId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        JsonNode after = fetchSummaryData(token, null, null);

        assertEquals(productsBefore + 2, after.path("totalProducts").asLong(),
                "totalProducts must count both products, including the soft-deleted one");
        assertEquals(trendingBefore + 1, after.path("trendingCount").asLong(),
                "trendingCount must count only the still-active trending product");
        assertEquals(bestSellerBefore + 1, after.path("bestSellerCount").asLong(),
                "bestSellerCount must count only the still-active best-seller product");
    }

    @Test
    void summary_excludesClicksOutsideRange_includesClicksInsideRange() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Boundary Category");
        Long productId = createProductId(token, "Boundary Product", categoryId, new BigDecimal("20.00"), false, false, true);

        // The click's clicked_at is a DB-generated TIMESTAMP evaluated in the MySQL container's
        // session timezone (UTC), while LocalDate.now() below runs in the JVM's local timezone.
        // A plain "today"/"yesterday" split can therefore land on the wrong side of the boundary
        // depending on the developer's machine timezone and time of day. Use a generous 2-day
        // buffer on each side of "now" so the range comparisons are correct regardless of any
        // JVM/DB timezone offset, while still proving both that an out-of-range query excludes
        // the click and that an in-range query includes it.
        LocalDate now = LocalDate.now();
        LocalDate excludeFrom = now.minusDays(10);
        LocalDate excludeTo = now.minusDays(2);
        LocalDate includeFrom = now.minusDays(2);
        LocalDate includeTo = now.plusDays(2);

        long excludedClicksBefore = fetchSummaryData(token, excludeFrom.toString(), excludeTo.toString())
                .path("totalClicks").asLong();
        long includedClicksBefore = fetchSummaryData(token, includeFrom.toString(), includeTo.toString())
                .path("totalClicks").asLong();

        mockMvc.perform(post("/api/public/products/{id}/click", productId));

        long excludedClicksAfter = fetchSummaryData(token, excludeFrom.toString(), excludeTo.toString())
                .path("totalClicks").asLong();
        long includedClicksAfter = fetchSummaryData(token, includeFrom.toString(), includeTo.toString())
                .path("totalClicks").asLong();

        assertEquals(excludedClicksBefore, excludedClicksAfter,
                "a click recorded just now must not appear in a from/to range that ends well in the past");
        assertEquals(includedClicksBefore + 1, includedClicksAfter,
                "a click recorded just now must appear in a from/to range that safely spans the present moment");
    }

    @Test
    void analytics_roundsCommission_halfUp_whenResultIsNotAlreadyExactToTwoDecimals() throws Exception {
        String token = adminToken();

        // 7.77% commission rate category
        var categoryResult = mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CategoryRequest("Rounding Trap Category", new BigDecimal("7.77"), null, true))))
                .andReturn();
        Long categoryId = objectMapper.readTree(categoryResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        Long productId = createProductId(token, "Rounding Trap Product", categoryId, new BigDecimal("50.00"), false, false, true);

        for (int i = 0; i < 3; i++) {
            mockMvc.perform(post("/api/public/products/{id}/click", productId));
        }

        // 50.00 * (7.77 / 100) * 3 = 11.655 (exact) -> HALF_UP to 2dp -> 11.66
        mockMvc.perform(get("/api/admin/dashboard/analytics")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.commissionByCategory[?(@.categoryName == 'Rounding Trap Category')].estimatedCommission")
                        .value(org.hamcrest.Matchers.contains(11.66)));
    }

    @Test
    void analytics_mostClickedProducts_orderedByClickCountDescending() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Ordering Category");

        Long highId = createProductId(token, "Ordering High Product", categoryId, new BigDecimal("10.00"), false, false, true);
        Long lowId = createProductId(token, "Ordering Low Product", categoryId, new BigDecimal("10.00"), false, false, true);

        for (int i = 0; i < 6; i++) {
            mockMvc.perform(post("/api/public/products/{id}/click", highId));
        }
        mockMvc.perform(post("/api/public/products/{id}/click", lowId));

        var result = mockMvc.perform(get("/api/admin/dashboard/analytics")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode mostClicked = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("mostClickedProducts");

        int highIndex = -1;
        int lowIndex = -1;
        for (int i = 0; i < mostClicked.size(); i++) {
            long id = mostClicked.get(i).path("productId").asLong();
            if (id == highId) {
                highIndex = i;
            }
            if (id == lowId) {
                lowIndex = i;
            }
        }

        assertTrue(highIndex >= 0, "the high-click product should appear in mostClickedProducts");
        assertTrue(lowIndex >= 0, "the low-click product should appear in mostClickedProducts");
        assertTrue(highIndex < lowIndex, "the product with more clicks must be ordered before the product with fewer clicks");
        assertEquals(6, mostClicked.get(highIndex).path("clickCount").asLong());
        assertEquals(1, mostClicked.get(lowIndex).path("clickCount").asLong());
    }

    @Test
    void summary_publishedGuideCount_countsOnlyActivePublicGuides() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Published Count Guide Category");

        long before = fetchSummaryData(token, null, null).path("publishedGuideCount").asLong();

        // Active + PUBLIC: counts.
        createBuyingGuideId(token, "Published Count Guide A", guideCategoryId, true, Visibility.PUBLIC);
        // Active + PRIVATE: must not count.
        createBuyingGuideId(token, "Published Count Guide B", guideCategoryId, true, Visibility.PRIVATE);
        // Inactive + PUBLIC: must not count.
        createBuyingGuideId(token, "Published Count Guide C", guideCategoryId, false, Visibility.PUBLIC);

        long after = fetchSummaryData(token, null, null).path("publishedGuideCount").asLong();

        assertEquals(before + 1, after,
                "publishedGuideCount must count only guides that are both active and PUBLIC");
    }

    @Test
    void summary_draftProductCount_countsOnlyInactiveProducts() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Draft Product Count Category");

        long before = fetchSummaryData(token, null, null).path("draftProductCount").asLong();

        createProductId(token, "Draft Count Active Product", categoryId, new BigDecimal("10.00"), false, false, true);
        createProductId(token, "Draft Count Inactive Product", categoryId, new BigDecimal("10.00"), false, false, false);

        long after = fetchSummaryData(token, null, null).path("draftProductCount").asLong();

        assertEquals(before + 1, after, "draftProductCount must count only inactive products");
    }

    @Test
    void summary_draftGuideCount_countsOnlyInactiveGuides() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Draft Guide Count Category");

        long before = fetchSummaryData(token, null, null).path("draftGuideCount").asLong();

        createBuyingGuideId(token, "Draft Count Active Guide", categoryId, true, Visibility.PUBLIC);
        createBuyingGuideId(token, "Draft Count Inactive Guide", categoryId, false, Visibility.PUBLIC);

        long after = fetchSummaryData(token, null, null).path("draftGuideCount").asLong();

        assertEquals(before + 1, after, "draftGuideCount must count only inactive guides");
    }

    @Test
    void summary_emptyCategoryCount_countsOnlyCategoriesWithNoActiveProducts() throws Exception {
        String token = adminToken();
        long before = fetchSummaryData(token, null, null).path("emptyCategoryCount").asLong();

        Long categoryWithActiveProductId = createCategoryId(token, "Empty Category Count Has Product");
        Long emptyCategoryId = createCategoryId(token, "Empty Category Count Truly Empty");
        Long categoryWithOnlyInactiveProductId = createCategoryId(token, "Empty Category Count Only Inactive");

        createProductId(token, "Empty Category Count Active Product", categoryWithActiveProductId, new BigDecimal("10.00"), false, false, true);
        createProductId(token, "Empty Category Count Inactive Product", categoryWithOnlyInactiveProductId, new BigDecimal("10.00"), false, false, false);

        long after = fetchSummaryData(token, null, null).path("emptyCategoryCount").asLong();

        assertEquals(before + 2, after,
                "emptyCategoryCount must count the truly-empty category and the only-inactive-products category, but not the one with an active product");
    }

    @Test
    void analytics_topCategories_ranksByClickCount_omittingZeroClickCategories() throws Exception {
        String token = adminToken();
        Long busyCategoryId = createCategoryId(token, "Top Categories Busy Category");
        Long quietCategoryId = createCategoryId(token, "Top Categories Quiet Category");
        Long silentCategoryId = createCategoryId(token, "Top Categories Silent Category");

        Long busyProductId = createProductId(token, "Top Categories Busy Product", busyCategoryId, new BigDecimal("10.00"), false, false, true);
        Long quietProductId = createProductId(token, "Top Categories Quiet Product", quietCategoryId, new BigDecimal("10.00"), false, false, true);
        createProductId(token, "Top Categories Silent Product", silentCategoryId, new BigDecimal("10.00"), false, false, true);

        // The dashboard's topCategories endpoint queries all-time, shared-DB data (no from/to
        // in this test) and caps results to the top 5 categories overall. Other tests in this
        // suite create categories with a handful of clicks each (this file's highest is 6), so
        // these counts need clear headroom above that to reliably land in the shared top 5,
        // matching the same tolerance the existing analytics_mostClickedProducts_* test below
        // already relies on for the identical shared-DB ranking problem.
        for (int i = 0; i < 20; i++) {
            mockMvc.perform(post("/api/public/products/{id}/click", busyProductId));
        }
        for (int i = 0; i < 15; i++) {
            mockMvc.perform(post("/api/public/products/{id}/click", quietProductId));
        }

        var result = mockMvc.perform(get("/api/admin/dashboard/analytics")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode topCategories = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("topCategories");

        int busyIndex = -1;
        int quietIndex = -1;
        boolean silentPresent = false;
        for (int i = 0; i < topCategories.size(); i++) {
            JsonNode row = topCategories.get(i);
            String name = row.path("categoryName").asText();
            if (name.equals("Top Categories Busy Category")) {
                busyIndex = i;
                assertEquals(20, row.path("clickCount").asLong());
            }
            if (name.equals("Top Categories Quiet Category")) {
                quietIndex = i;
                assertEquals(15, row.path("clickCount").asLong());
            }
            if (name.equals("Top Categories Silent Category")) {
                silentPresent = true;
            }
        }

        assertTrue(busyIndex >= 0, "the busy category should appear in topCategories");
        assertTrue(quietIndex >= 0, "the quiet category should appear in topCategories");
        assertTrue(busyIndex < quietIndex, "the category with more clicks must be ordered before the one with fewer");
        assertFalse(silentPresent, "a category with zero clicks in range must not appear in topCategories");
    }

    @Test
    void analytics_recentProducts_returnsFiveMostRecent_regardlessOfActiveFlag_withRangeScopedClicks() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Recent Products Category");

        Long inactiveProductId = createProductId(token, "Recent Products Draft Product", categoryId, new BigDecimal("10.00"), false, false, false);
        mockMvc.perform(post("/api/public/products/{id}/click", inactiveProductId));
        mockMvc.perform(post("/api/public/products/{id}/click", inactiveProductId));

        var result = mockMvc.perform(get("/api/admin/dashboard/analytics")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode recentProducts = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("recentProducts");

        boolean found = false;
        for (int i = 0; i < recentProducts.size(); i++) {
            JsonNode row = recentProducts.get(i);
            if (row.path("id").asLong() == inactiveProductId) {
                found = true;
                assertEquals(false, row.path("active").asBoolean());
                assertEquals(2, row.path("clicks").asLong());
            }
        }
        assertTrue(found, "an inactive (draft) product must still appear in recentProducts if it's among the 5 most recently created");
        assertTrue(recentProducts.size() <= 5, "recentProducts must never return more than 5 rows");
    }

    @Test
    void analytics_latestGuides_returnsFiveMostRecent_regardlessOfActiveFlag_withRangeScopedViews() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Latest Guides Category");

        Long draftGuideId = createBuyingGuideId(token, "Latest Guides Draft Guide", categoryId, false, Visibility.PUBLIC);
        mockMvc.perform(post("/api/public/buying-guides/{id}/view", draftGuideId));
        mockMvc.perform(post("/api/public/buying-guides/{id}/view", draftGuideId));
        mockMvc.perform(post("/api/public/buying-guides/{id}/view", draftGuideId));

        var result = mockMvc.perform(get("/api/admin/dashboard/analytics")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode latestGuides = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("latestGuides");

        boolean found = false;
        for (int i = 0; i < latestGuides.size(); i++) {
            JsonNode row = latestGuides.get(i);
            if (row.path("id").asLong() == draftGuideId) {
                found = true;
                assertEquals(false, row.path("active").asBoolean());
                assertEquals(3, row.path("views").asLong());
            }
        }
        assertTrue(found, "a draft guide must still appear in latestGuides if it's among the 5 most recently created");
        assertTrue(latestGuides.size() <= 5, "latestGuides must never return more than 5 rows");
    }

    @Test
    void export_returnsCsvWithRealSummaryAndDailyData() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Export Test Category");
        Long productId = createProductId(token, "Export Test Product", categoryId, new BigDecimal("10.00"), false, false, true);
        mockMvc.perform(post("/api/public/products/{id}/click", productId));

        var result = mockMvc.perform(get("/api/admin/dashboard/export")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().contentType("text/csv"))
                .andReturn();

        String contentDisposition = result.getResponse().getHeader("Content-Disposition");
        assertTrue(contentDisposition != null && contentDisposition.startsWith("attachment; filename=\"dashboard-report_"),
                "Content-Disposition must attach a dashboard-report CSV file");

        String csv = result.getResponse().getContentAsString();
        assertTrue(csv.contains("Metric,Value"), "CSV must include the summary header row");
        assertTrue(csv.contains("Date,Views,Clicks"), "CSV must include the daily-data header row");
        assertTrue(csv.contains("Total Products,"), "CSV must include a Total Products row");
    }

    @Test
    void export_includesRequestedDateRangeInFilename() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/admin/dashboard/export")
                        .header("Authorization", "Bearer " + token)
                        .param("from", "2026-07-01")
                        .param("to", "2026-07-31"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition",
                        "attachment; filename=\"dashboard-report_2026-07-01_to_2026-07-31.csv\""));
    }

    private Long createBuyingGuideId(String token, String title, Long categoryId, boolean active,
                                      Visibility visibility) throws Exception {
        BuyingGuideRequest request = new BuyingGuideRequest(
                title, "", "Excerpt for " + title, "Introduction", null,
                categoryId, null, null, active, null, List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(), null, List.of(), null,
                visibility, true, true, null, null, null, "summary_large_image");

        var result = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }

    private Long createProductId(String token, String name, Long categoryId, BigDecimal price,
                                  boolean trending, boolean bestSeller, boolean active) throws Exception {
        String link = "https://amazon.com/dp/" + name.toLowerCase().replace(" ", "-");
        var result = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ProductRequest(
                                name, "Test product for dashboard analytics.", categoryId, null,
                                price, link, trending, bestSeller, active, null, null,
                null, null, null))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }

    private JsonNode fetchSummaryData(String token, String from, String to) throws Exception {
        var request = get("/api/admin/dashboard/summary").header("Authorization", "Bearer " + token);
        if (from != null) {
            request = request.param("from", from);
        }
        if (to != null) {
            request = request.param("to", to);
        }
        var result = mockMvc.perform(request)
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
    }
}
