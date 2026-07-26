package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.ProductRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminProductControllerTest extends AbstractIntegrationTest {

    @Test
    void create_succeeds_withValidPayload() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Kitchen Gadgets");
        ProductRequest request = new ProductRequest(
                "Air Fryer", "A compact 4-quart air fryer.", categoryId, null,
                new BigDecimal("79.99"), "https://amazon.com/dp/example", true, false, true);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Air Fryer"))
                .andExpect(jsonPath("$.data.categoryName").value("Kitchen Gadgets"));
    }

    @Test
    void create_returns400_withNegativePrice() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Negative Price Category");
        ProductRequest request = new ProductRequest(
                "Bad Product", "Invalid price.", categoryId, null,
                new BigDecimal("-1.00"), "https://amazon.com/dp/example", false, false, true);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_withNonHttpsLink() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Insecure Link Category");
        ProductRequest request = new ProductRequest(
                "Bad Link Product", "Invalid link.", categoryId, null,
                new BigDecimal("10.00"), "http://amazon.com/dp/example", false, false, true);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns404_whenCategoryDoesNotExist() throws Exception {
        String token = adminToken();
        ProductRequest request = new ProductRequest(
                "Orphan Product", "No such category.", 999999L, null,
                new BigDecimal("10.00"), "https://amazon.com/dp/example", false, false, true);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_softDeletes_settingActiveFalse() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Soft Delete Category");
        ProductRequest request = new ProductRequest(
                "Deletable Product", "Will be soft-deleted.", categoryId, null,
                new BigDecimal("20.00"), "https://amazon.com/dp/example", false, false, true);

        var createResult = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();
        Long productId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(delete("/api/admin/products/{id}", productId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/products/{id}", productId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data.active").value(false));
    }
}
