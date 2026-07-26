package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.CategoryRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminCategoryControllerTest extends AbstractIntegrationTest {

    @Test
    void create_succeeds_withValidPayload() throws Exception {
        String token = adminToken();
        CategoryRequest request = new CategoryRequest("Electronics", new BigDecimal("4.50"));

        mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.productCategoryName").value("Electronics"))
                .andExpect(jsonPath("$.data.commissionRate").value(4.50));
    }

    @Test
    void create_returns409_onDuplicateName() throws Exception {
        String token = adminToken();
        CategoryRequest request = new CategoryRequest("Home & Kitchen", new BigDecimal("5.00"));

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
        CategoryRequest request = new CategoryRequest("Invalid Rate Category", new BigDecimal("150.00"));

        mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns401_withoutToken() throws Exception {
        CategoryRequest request = new CategoryRequest("No Auth Category", new BigDecimal("3.00"));

        mockMvc.perform(post("/api/admin/categories")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}
