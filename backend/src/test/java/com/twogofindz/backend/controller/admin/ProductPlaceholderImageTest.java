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

        // A complete request, as the real admin settings form always submits every field
        // (a settings PUT is a full-replace upsert, not a partial patch). This avoids
        // wiping other settings fields to null for later tests sharing this single row
        // across the same Testcontainers JVM run.
        SettingsRequest settingsRequest = new SettingsRequest(
                "logo.png", "hero.jpg", "configured-placeholder.png",
                "https://tiktok.com/@2gofindz", "https://pinterest.com/2gofindz",
                "https://instagram.com/2gofindz", "https://youtube.com/@2gofindz",
                "https://facebook.com/2gofindz",
                "Shop bio for placeholder test.", "Placeholder Test Headline",
                "Placeholder test description.", "Placeholder test disclosure.",
                "placeholder-test@2gofindz.com");
        mockMvc.perform(put("/api/admin/settings")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(settingsRequest)));

        Long categoryId = createCategoryId(token, "Placeholder Fallback Category");
        ProductRequest productRequest = new ProductRequest(
                "No Image Product", "Has no image set.", categoryId, null,
                new BigDecimal("12.00"), "https://amazon.com/dp/noimage", false, false, true, null, null,
                null, null, null);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imageFileName").value("configured-placeholder.png"));
    }
}
