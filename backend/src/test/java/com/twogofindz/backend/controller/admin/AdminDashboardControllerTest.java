package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.ProductRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
                                        "Commission Math Category", new BigDecimal("10.00")))))
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
                                false, false, true))))
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
}
