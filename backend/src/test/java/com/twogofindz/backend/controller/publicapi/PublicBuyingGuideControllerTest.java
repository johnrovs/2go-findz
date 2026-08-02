package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.request.ProductRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicBuyingGuideControllerTest extends AbstractIntegrationTest {

    @Test
    void getAll_returnsOnlyActiveGuides() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Public List Guide Category");

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Public Active Guide", "public-active-guide", "Excerpt", "Introduction", null,
                        categoryId, null, null, true, null, List.of()))));

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Public Draft Guide", "public-draft-guide", "Excerpt", "Introduction", null,
                        categoryId, null, null, false, null, List.of()))));

        mockMvc.perform(get("/api/public/buying-guides"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.title == 'Public Draft Guide')]").isEmpty())
                .andExpect(jsonPath("$.data[?(@.title == 'Public Active Guide')]").exists());
    }

    @Test
    void getBySlug_returns404_forInactiveGuide() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Public Inactive Guide Category");

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Inactive Detail Guide", "inactive-detail-guide", "Excerpt", "Introduction", null,
                        categoryId, null, null, false, null, List.of()))));

        mockMvc.perform(get("/api/public/buying-guides/{slug}", "inactive-detail-guide"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getBySlug_returns404_forUnknownSlug() throws Exception {
        mockMvc.perform(get("/api/public/buying-guides/{slug}", "no-such-guide"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getBySlug_returnsActiveGuide_withRecommendedProductsInOrder() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Public Detail Guide Category");
        Long productCategoryId = createCategoryId(token, "Public Guide Product Category");
        Long firstProductId = createProductId(token, productCategoryId, "Public Guide Product A");
        Long secondProductId = createProductId(token, productCategoryId, "Public Guide Product B");

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Public Detail Guide", "public-detail-guide", "Excerpt", "Full introduction body.",
                        null, guideCategoryId, null, null, true, null,
                        List.of(secondProductId, firstProductId)))));

        mockMvc.perform(get("/api/public/buying-guides/{slug}", "public-detail-guide"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Public Detail Guide"))
                .andExpect(jsonPath("$.data.introduction").value("Full introduction body."))
                .andExpect(jsonPath("$.data.recommendedProducts[0].id").value(secondProductId))
                .andExpect(jsonPath("$.data.recommendedProducts[1].id").value(firstProductId));
    }

    private Long createProductId(String token, Long categoryId, String name) throws Exception {
        var result = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ProductRequest(
                                name, "Test product for public buying guide.", categoryId, null,
                                new BigDecimal("25.00"), "https://amazon.com/dp/" + name.replace(" ", "-"),
                                false, false, true, null, null, null, null))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }
}
