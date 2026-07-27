package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.HeroBannerRequest;
import org.junit.jupiter.api.Test;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicHeroBannerControllerTest extends AbstractIntegrationTest {

    @Test
    void getAll_returnsOnlyActiveBanners_orderedByDisplayOrder() throws Exception {
        String token = adminToken();
        String imageFilename = uploadTestImage(token);

        mockMvc.perform(post("/api/admin/hero-banners")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new HeroBannerRequest(
                        imageFilename, "Alt one", "Badge", "Public Second Slide", "Desc", "Button", "/trending", 2, true))));

        mockMvc.perform(post("/api/admin/hero-banners")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new HeroBannerRequest(
                        imageFilename, "Alt two", "Badge", "Public First Slide", "Desc", "Button", "/categories", 1, true))));

        mockMvc.perform(post("/api/admin/hero-banners")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new HeroBannerRequest(
                        imageFilename, "Alt three", "Badge", "Public Inactive Slide", "Desc", "Button", "/guides", 0, false))));

        mockMvc.perform(get("/api/public/hero-banners"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.headline == 'Public Inactive Slide')]").isEmpty())
                .andExpect(jsonPath("$.data[?(@.headline == 'Public First Slide')]").exists())
                .andExpect(jsonPath("$.data[?(@.headline == 'Public Second Slide')]").exists());
    }
}
