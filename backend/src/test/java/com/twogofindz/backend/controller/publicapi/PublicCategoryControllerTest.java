package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.CategoryRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicCategoryControllerTest extends AbstractIntegrationTest {

    @Test
    void getAll_neverExposesCommissionRate() throws Exception {
        String token = adminToken();
        createCategoryId(token, "Toys");

        mockMvc.perform(get("/api/public/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].productCategoryName").exists())
                .andExpect(jsonPath("$.data[0].commissionRate").doesNotExist());
    }

    @Test
    void getAll_exposesImageFileNameWhenConfigured() throws Exception {
        String token = adminToken();
        CategoryRequest request = new CategoryRequest("Garden Tools", new BigDecimal("5.00"), "img_garden_tools.jpg");
        mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/public/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.productCategoryName == 'Garden Tools')].imageFileName")
                        .value("img_garden_tools.jpg"));
    }
}
