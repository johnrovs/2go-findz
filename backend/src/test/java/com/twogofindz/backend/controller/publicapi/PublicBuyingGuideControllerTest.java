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

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Public Active Guide", "Excerpt", "Content", null, true, List.of()))));

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Public Draft Guide", "Excerpt", "Content", null, false, List.of()))));

        mockMvc.perform(get("/api/public/buying-guides"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.title == 'Public Draft Guide')]").isEmpty())
                .andExpect(jsonPath("$.data[?(@.title == 'Public Active Guide')]").exists());
    }

    @Test
    void getById_returns404_forInactiveGuide() throws Exception {
        String token = adminToken();
        var createResult = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                                "Inactive Detail Guide", "Excerpt", "Content", null, false, List.of()))))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(get("/api/public/buying-guides/{id}", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void getById_returns404_forUnknownGuide() throws Exception {
        mockMvc.perform(get("/api/public/buying-guides/{id}", 999999L))
                .andExpect(status().isNotFound());
    }

    @Test
    void getById_returnsActiveGuide_withRecommendedProductsInOrder() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Public Guide Category");
        Long firstProductId = createProductId(token, categoryId, "Public Guide Product A");
        Long secondProductId = createProductId(token, categoryId, "Public Guide Product B");

        var createResult = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                                "Public Detail Guide", "Excerpt", "Full content body.", null, true,
                                List.of(secondProductId, firstProductId)))))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(get("/api/public/buying-guides/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Public Detail Guide"))
                .andExpect(jsonPath("$.data.content").value("Full content body."))
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
                                false, false, true, null, null))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }
}
