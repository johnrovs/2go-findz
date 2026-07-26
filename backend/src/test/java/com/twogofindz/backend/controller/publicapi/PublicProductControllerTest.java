package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.ProductRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicProductControllerTest extends AbstractIntegrationTest {

    @Test
    void search_neverReturnsInactiveProducts() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Public Test Category");

        ProductRequest inactiveProduct = new ProductRequest(
                "Hidden Product", "Should never show publicly.", categoryId, null,
                new BigDecimal("15.00"), "https://amazon.com/dp/hidden", false, false, false);

        mockMvc.perform(post("/api/admin/products")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(inactiveProduct)));

        mockMvc.perform(get("/api/public/products").param("search", "Hidden Product"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isEmpty());
    }

    @Test
    void getById_returns404_forUnknownProduct() throws Exception {
        mockMvc.perform(get("/api/public/products/{id}", 999999L))
                .andExpect(status().isNotFound());
    }

    @Test
    void getById_returns404_forInactiveProduct_butAdminStillSeesIt() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Inactive Visibility Category");
        ProductRequest inactiveProduct = new ProductRequest(
                "Inactive Product", "Created inactive directly.", categoryId, null,
                new BigDecimal("12.00"), "https://amazon.com/dp/inactive", false, false, false);

        var createResult = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(inactiveProduct)))
                .andReturn();
        Long productId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Public getById must hide inactive products just like search already does — same 404
        // as a truly nonexistent id, no information leak about whether the id exists at all.
        mockMvc.perform(get("/api/public/products/{id}", productId))
                .andExpect(status().isNotFound());

        // Admins still need full visibility, e.g. to reactivate the product.
        mockMvc.perform(get("/api/admin/products/{id}", productId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false));
    }

    @Test
    void recordClick_succeeds_forExistingProduct() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Click Tracking Category");
        var createResult = mockMvc.perform(
                        org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/admin/products")
                                .header("Authorization", "Bearer " + token)
                                .contentType(APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(new ProductRequest(
                                        "Clickable Product", "Tracks clicks.", categoryId, null,
                                        new java.math.BigDecimal("30.00"), "https://amazon.com/dp/clickable",
                                        false, false, true))))
                .andReturn();
        Long productId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(post("/api/public/products/{id}/click", productId)
                        .contentType(APPLICATION_JSON)
                        .content("{\"sessionId\":\"test-session-123\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void recordClick_succeeds_withoutSessionIdInBody() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "No Session Click Category");
        var createResult = mockMvc.perform(
                        org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/admin/products")
                                .header("Authorization", "Bearer " + token)
                                .contentType(APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(new ProductRequest(
                                        "No Session Product", "No session id sent.", categoryId, null,
                                        new java.math.BigDecimal("15.00"), "https://amazon.com/dp/nosession",
                                        false, false, true))))
                .andReturn();
        Long productId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(post("/api/public/products/{id}/click", productId))
                .andExpect(status().isOk());
    }

    @Test
    void recordClick_returns404_forUnknownProduct() throws Exception {
        mockMvc.perform(post("/api/public/products/{id}/click", 999999L))
                .andExpect(status().isNotFound());
    }
}
