package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.ProductRequest;
import com.twogofindz.backend.dto.request.SettingsRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProductPlaceholderImageTest extends AbstractIntegrationTest {

    @Test
    void productWithoutImage_fallsBackToConfiguredPlaceholder() throws Exception {
        String token = adminToken();

        SettingsRequest settingsRequest = new SettingsRequest(
                null, null, "configured-placeholder.png", null, null, null, null,
                null, null, null, null, null);
        mockMvc.perform(put("/api/admin/settings")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(settingsRequest)));

        Long categoryId = createCategoryId(token, "Placeholder Fallback Category");
        ProductRequest productRequest = new ProductRequest(
                "No Image Product", "Has no image set.", categoryId, null,
                new BigDecimal("12.00"), "https://amazon.com/dp/noimage", false, false, true);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imageFileName").value("configured-placeholder.png"));
    }
}
