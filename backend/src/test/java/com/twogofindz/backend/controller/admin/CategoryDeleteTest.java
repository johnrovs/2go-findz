package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.ProductRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CategoryDeleteTest extends AbstractIntegrationTest {

    @Test
    void delete_succeeds_whenNoProductsAssigned() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Empty Category");

        mockMvc.perform(delete("/api/admin/categories/{id}", categoryId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void delete_returns409_whenProductsAssigned() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "In Use Category");
        ProductRequest product = new ProductRequest(
                "Blocking Product", "Keeps the category in use.", categoryId, null,
                new BigDecimal("25.00"), "https://amazon.com/dp/blocking", false, false, true, null, null,
                null, null, null);

        mockMvc.perform(post("/api/admin/products")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(product)));

        mockMvc.perform(delete("/api/admin/categories/{id}", categoryId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());
    }
}
