package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.request.ProductRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminBuyingGuideControllerTest extends AbstractIntegrationTest {

    @Test
    void create_succeeds_withRecommendedProductsInOrder() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Guide Order Category");
        Long firstProductId = createProductId(token, categoryId, "Guide Product A");
        Long secondProductId = createProductId(token, categoryId, "Guide Product B");

        BuyingGuideRequest request = new BuyingGuideRequest(
                "Best Kitchen Gadgets 2026", "A quick roundup of our favorite kitchen gadgets.",
                "Full article content here.", null, true, List.of(secondProductId, firstProductId));

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Best Kitchen Gadgets 2026"))
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.recommendedProducts[0].id").value(secondProductId))
                .andExpect(jsonPath("$.data.recommendedProducts[1].id").value(firstProductId));
    }

    @Test
    void create_returns400_whenTitleBlank() throws Exception {
        String token = adminToken();
        BuyingGuideRequest request = new BuyingGuideRequest("", "Excerpt", "Content", null, true, List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns401_withoutToken() throws Exception {
        BuyingGuideRequest request = new BuyingGuideRequest("Title", "Excerpt", "Content", null, true, List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void update_succeeds_andReordersRecommendedProducts() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Guide Update Category");
        Long firstProductId = createProductId(token, categoryId, "Guide Update Product A");
        Long secondProductId = createProductId(token, categoryId, "Guide Update Product B");

        var createResult = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                                "Original Title", "Original excerpt", "Original content", null, true,
                                List.of(firstProductId, secondProductId)))))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        BuyingGuideRequest updateRequest = new BuyingGuideRequest(
                "Updated Title", "Updated excerpt", "Updated content", null, false,
                List.of(secondProductId, firstProductId));

        mockMvc.perform(put("/api/admin/buying-guides/{id}", id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Updated Title"))
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(jsonPath("$.data.recommendedProducts[0].id").value(secondProductId))
                .andExpect(jsonPath("$.data.recommendedProducts[1].id").value(firstProductId));

        mockMvc.perform(get("/api/admin/buying-guides/{id}", id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Updated Title"));
    }

    @Test
    void getById_returns404_forUnknownGuide() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/admin/buying-guides/{id}", 999999L)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_succeeds_andRemovesFromGetAll() throws Exception {
        String token = adminToken();

        var createResult = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                                "Deletable Guide", "Excerpt", "Content", null, true, List.of()))))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(delete("/api/admin/buying-guides/{id}", id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        var getAllResult = mockMvc.perform(get("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        var dataArray = objectMapper.readTree(getAllResult.getResponse().getContentAsString()).path("data");
        boolean stillPresent = false;
        for (var node : dataArray) {
            if (node.path("id").asLong() == id) {
                stillPresent = true;
                break;
            }
        }
        assertFalse(stillPresent, "Deleted buying guide must not appear in the admin list");
    }

    private Long createProductId(String token, Long categoryId, String name) throws Exception {
        var result = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ProductRequest(
                                name, "Test product for buying guide.", categoryId, null,
                                new BigDecimal("25.00"), "https://amazon.com/dp/" + name.replace(" ", "-"),
                                false, false, true, null, null))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }
}
