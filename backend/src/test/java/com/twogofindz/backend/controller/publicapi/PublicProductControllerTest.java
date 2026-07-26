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
}
