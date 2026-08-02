package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.ProductRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminProductControllerTest extends AbstractIntegrationTest {

    @Test
    void create_succeeds_withValidPayload() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Kitchen Gadgets");
        ProductRequest request = new ProductRequest(
                "Air Fryer", "A compact 4-quart air fryer.", categoryId, null,
                new BigDecimal("79.99"), "https://amazon.com/dp/example", true, false, true, null, null,
                null, null, null);

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
                new BigDecimal("-1.00"), "https://amazon.com/dp/example", false, false, true, null, null,
                null, null, null);

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
                new BigDecimal("10.00"), "http://amazon.com/dp/example", false, false, true, null, null,
                null, null, null);

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
                new BigDecimal("10.00"), "https://amazon.com/dp/example", false, false, true, null, null,
                null, null, null);

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
                new BigDecimal("20.00"), "https://amazon.com/dp/example", false, false, true, null, null,
                null, null, null);

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

    @Test
    void createThenUpdate_returnsFreshNonNullTimestamps() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Timestamp Product Category");
        ProductRequest createRequest = new ProductRequest(
                "Blender", "A powerful countertop blender.", categoryId, null,
                new BigDecimal("49.99"), "https://amazon.com/dp/blender", false, false, true, null, null,
                null, null, null);

        var createResult = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.data.updatedAt").isNotEmpty())
                .andReturn();

        var createdJson = objectMapper.readTree(createResult.getResponse().getContentAsString());
        Long productId = createdJson.path("data").path("id").asLong();
        String createdUpdatedAt = createdJson.path("data").path("updatedAt").asText();

        // MySQL TIMESTAMP columns here have second-level resolution, so we need real wall-clock
        // time to cross a full second boundary before ON UPDATE CURRENT_TIMESTAMP produces a new
        // value. A fixed sleep is unreliable against Docker/VM clock drift (e.g. Colima), so
        // retry with a genuinely different value (required for MySQL to even consider the row
        // "changed" and fire the trigger) across a few sleep/update cycles.
        String updatedUpdatedAt = createdUpdatedAt;
        for (int attempt = 1; attempt <= 5 && updatedUpdatedAt.equals(createdUpdatedAt); attempt++) {
            Thread.sleep(1100);
            ProductRequest updateRequest = new ProductRequest(
                    "Blender", "A powerful countertop blender.", categoryId, null,
                    new BigDecimal("54.99").add(new BigDecimal(attempt)),
                    "https://amazon.com/dp/blender", false, false, true, null, null,
                null, null, null);
            var updateResult = mockMvc.perform(put("/api/admin/products/{id}", productId)
                            .header("Authorization", "Bearer " + token)
                            .contentType(APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updateRequest)))
                    .andExpect(status().isOk())
                    .andReturn();

            updatedUpdatedAt = objectMapper.readTree(updateResult.getResponse().getContentAsString())
                    .path("data").path("updatedAt").asText();
        }

        assertNotEquals(createdUpdatedAt, updatedUpdatedAt,
                "updatedAt must advance after an update, not stay frozen at the create-time value");
    }

    @Test
    void update_returns400_whenActiveFieldOmittedEntirely() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Missing Active Field Category");
        ProductRequest createRequest = new ProductRequest(
                "Toaster", "A basic toaster.", categoryId, null,
                new BigDecimal("29.99"), "https://amazon.com/dp/toaster", false, false, true, null, null,
                null, null, null);

        var createResult = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andReturn();
        Long productId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Simulates a client that only wants to update the price and never sends "active" at
        // all. Without @NotNull on the boxed Boolean, Jackson would deserialize this as false
        // and silently soft-delete the product as a side effect of an unrelated field edit.
        String jsonMissingActive = """
                {
                  "name": "Toaster",
                  "description": "A basic toaster.",
                  "categoryId": %d,
                  "imageFileName": null,
                  "productPrice": 34.99,
                  "productLink": "https://amazon.com/dp/toaster",
                  "trending": false,
                  "bestSeller": false
                }
                """.formatted(categoryId);

        mockMvc.perform(put("/api/admin/products/{id}", productId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(jsonMissingActive))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.active").exists());

        mockMvc.perform(get("/api/admin/products/{id}", productId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data.active").value(true));
    }

    @Test
    void create_withScheduledPublishAt_forcesActiveFalse() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Scheduled Product Category");
        ProductRequest request = new ProductRequest(
                "Scheduled Product", "Will publish later.", categoryId, null,
                new BigDecimal("15.00"), "https://amazon.com/dp/scheduled", false, false, true,
                null, LocalDateTime.now().plusDays(2),
                null, null, null);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(jsonPath("$.data.scheduledPublishAt").isNotEmpty());
    }

    @Test
    void create_withBrand_returnsBrandInResponse() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Brand Product Category");
        ProductRequest request = new ProductRequest(
                "Branded Product", "Has a brand.", categoryId, null,
                new BigDecimal("15.00"), "https://amazon.com/dp/branded", false, false, true,
                "Nike", null,
                null, null, null);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.brand").value("Nike"));
    }

    @Test
    void create_returns400_withPastScheduledPublishAt() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Past Schedule Category");
        ProductRequest request = new ProductRequest(
                "Bad Schedule Product", "Scheduled in the past.", categoryId, null,
                new BigDecimal("15.00"), "https://amazon.com/dp/pastschedule", false, false, true,
                null, LocalDateTime.now().minusDays(1),
                null, null, null);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_withRatingAndReviewCount_returnsThemInResponse() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Rated Product Category");
        ProductRequest request = new ProductRequest(
                "Rated Product", "Has rating and reviews.", categoryId, null,
                new BigDecimal("15.00"), "https://amazon.com/dp/rated", false, false, true,
                null, null, new BigDecimal("4.5"), 1200, null);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rating").value(4.5))
                .andExpect(jsonPath("$.data.reviewCount").value(1200));
    }

    @Test
    void create_withoutReviewCount_defaultsToZero() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Unrated Product Category");
        ProductRequest request = new ProductRequest(
                "Unrated Product", "No rating yet.", categoryId, null,
                new BigDecimal("15.00"), "https://amazon.com/dp/unrated", false, false, true,
                null, null, null, null, null);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rating").doesNotExist())
                .andExpect(jsonPath("$.data.reviewCount").value(0));
    }

    @Test
    void create_withSku_returnsSkuInResponse() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "SKU Product Category");
        ProductRequest request = new ProductRequest(
                "Skuvvy Product", "Has a sku.", categoryId, null,
                new BigDecimal("15.00"), "https://amazon.com/dp/skuvvy", false, false, true,
                null, null, null, null, "SKU-12345");

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sku").value("SKU-12345"));
    }
}
