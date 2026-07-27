package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.SettingsRequest;
import org.junit.jupiter.api.Test;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminSettingsControllerTest extends AbstractIntegrationTest {

    @Test
    void get_returnsSeededDefaults_beforeAnyUpdate() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/admin/settings").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.heroHeadline").isNotEmpty());
    }

    @Test
    void update_succeeds_andPersistsAllFields() throws Exception {
        String token = adminToken();
        SettingsRequest request = new SettingsRequest(
                "logo.png", "hero.jpg", "placeholder.png",
                "https://tiktok.com/@2gofindz", "https://pinterest.com/2gofindz",
                "https://instagram.com/2gofindz", "https://youtube.com/@2gofindz",
                "Updated shop bio.", "Updated Headline", "Updated description.",
                "Updated disclosure.", "contact@2gofindz.com");

        mockMvc.perform(put("/api/admin/settings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.heroHeadline").value("Updated Headline"))
                .andExpect(jsonPath("$.data.contactEmail").value("contact@2gofindz.com"));

        mockMvc.perform(get("/api/admin/settings").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data.shopBio").value("Updated shop bio."));
    }

    @Test
    void update_returns400_forInvalidEmail() throws Exception {
        String token = adminToken();
        SettingsRequest request = new SettingsRequest(
                null, null, null, null, null, null, null, null, null, null, null, "not-an-email");

        mockMvc.perform(put("/api/admin/settings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void get_returns401_withoutToken() throws Exception {
        mockMvc.perform(get("/api/admin/settings"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void update_returns400_forBlankAffiliateDisclosure() throws Exception {
        String token = adminToken();
        // affiliateDisclosure omitted (null) — since PUT is a full-replace, this would otherwise
        // silently null out the Amazon Associates compliance disclosure served by the public API.
        SettingsRequest request = new SettingsRequest(
                null, null, null, null, null, null, null, null, null, null, null, "contact@2gofindz.com");

        mockMvc.perform(put("/api/admin/settings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.affiliateDisclosure").exists());
    }
}
