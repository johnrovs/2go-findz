package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.CategoryRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminCategoryControllerTest extends AbstractIntegrationTest {

    @Test
    void create_succeeds_withValidPayload() throws Exception {
        String token = adminToken();
        CategoryRequest request = new CategoryRequest("Electronics", new BigDecimal("4.50"), null);

        mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.productCategoryName").value("Electronics"))
                .andExpect(jsonPath("$.data.commissionRate").value(4.50));
    }

    @Test
    void create_andUpdate_roundTripImageFileName() throws Exception {
        String token = adminToken();
        CategoryRequest createRequest = new CategoryRequest("Outdoor Gear", new BigDecimal("4.00"), "img_category_example.jpg");

        var createResult = mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imageFileName").value("img_category_example.jpg"))
                .andReturn();

        Long categoryId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        CategoryRequest updateRequest = new CategoryRequest("Outdoor Gear", new BigDecimal("4.00"), null);
        mockMvc.perform(put("/api/admin/categories/{id}", categoryId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imageFileName").doesNotExist());
    }

    @Test
    void create_returns409_onDuplicateName() throws Exception {
        String token = adminToken();
        CategoryRequest request = new CategoryRequest("Home & Kitchen", new BigDecimal("5.00"), null);

        mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    void create_returns400_whenCommissionRateOutOfRange() throws Exception {
        String token = adminToken();
        CategoryRequest request = new CategoryRequest("Invalid Rate Category", new BigDecimal("150.00"), null);

        mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns401_withoutToken() throws Exception {
        CategoryRequest request = new CategoryRequest("No Auth Category", new BigDecimal("3.00"), null);

        mockMvc.perform(post("/api/admin/categories")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createThenUpdate_returnsFreshNonNullTimestamps() throws Exception {
        String token = adminToken();
        CategoryRequest createRequest = new CategoryRequest("Timestamp Category", new BigDecimal("5.00"), null);

        var createResult = mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.data.updatedAt").isNotEmpty())
                .andReturn();

        var createdJson = objectMapper.readTree(createResult.getResponse().getContentAsString());
        Long categoryId = createdJson.path("data").path("id").asLong();
        String createdUpdatedAt = createdJson.path("data").path("updatedAt").asText();

        // MySQL TIMESTAMP columns here have second-level resolution, so we need real wall-clock
        // time to cross a full second boundary before ON UPDATE CURRENT_TIMESTAMP produces a new
        // value. A fixed sleep is unreliable against Docker/VM clock drift (e.g. Colima), so
        // retry with a genuinely different value (required for MySQL to even consider the row
        // "changed" and fire the trigger) across a few sleep/update cycles.
        String updatedUpdatedAt = createdUpdatedAt;
        for (int attempt = 1; attempt <= 5 && updatedUpdatedAt.equals(createdUpdatedAt); attempt++) {
            Thread.sleep(1100);
            CategoryRequest updateRequest =
                    new CategoryRequest("Timestamp Category Updated " + attempt, new BigDecimal("6.00"), null);
            var updateResult = mockMvc.perform(put("/api/admin/categories/{id}", categoryId)
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
}
