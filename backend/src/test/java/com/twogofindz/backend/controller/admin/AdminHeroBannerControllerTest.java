package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.HeroBannerRequest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminHeroBannerControllerTest extends AbstractIntegrationTest {

    private HeroBannerRequest validRequest(String imageFilename) {
        return new HeroBannerRequest(
                imageFilename,
                "Curated collection of trending gadgets and home products",
                "Trending Today",
                "Amazon Finds Everyone Is Talking About",
                "Discover trending products, useful gadgets, and everyday essentials.",
                "Explore Trending Finds",
                "/trending",
                1,
                true
        );
    }

    @Test
    void create_succeeds_withValidPayload() throws Exception {
        String token = adminToken();
        String imageFilename = uploadTestImage(token);

        mockMvc.perform(post("/api/admin/hero-banners")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest(imageFilename))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.headline").value("Amazon Finds Everyone Is Talking About"))
                .andExpect(jsonPath("$.data.buttonLink").value("/trending"))
                .andExpect(jsonPath("$.data.active").value(true));
    }

    @Test
    void create_returns400_whenHeadlineBlank() throws Exception {
        String token = adminToken();
        String imageFilename = uploadTestImage(token);
        HeroBannerRequest request = new HeroBannerRequest(
                imageFilename, "Alt text", "Badge", "", "Description", "Button", "/trending", 1, true);

        mockMvc.perform(post("/api/admin/hero-banners")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenButtonLinkIsNotAnInternalPath() throws Exception {
        String token = adminToken();
        String imageFilename = uploadTestImage(token);
        HeroBannerRequest request = new HeroBannerRequest(
                imageFilename, "Alt text", "Badge", "Headline", "Description", "Button",
                "https://example.com", 1, true);

        mockMvc.perform(post("/api/admin/hero-banners")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns401_withoutToken() throws Exception {
        mockMvc.perform(post("/api/admin/hero-banners")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest("img.jpg"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void update_succeeds_andGetAllReflectsChange() throws Exception {
        String token = adminToken();
        String imageFilename = uploadTestImage(token);

        var createResult = mockMvc.perform(post("/api/admin/hero-banners")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest(imageFilename))))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        HeroBannerRequest updateRequest = new HeroBannerRequest(
                imageFilename, "Updated alt text", "Updated Badge", "Updated Headline",
                "Updated description.", "Updated Button", "/categories", 2, false);

        mockMvc.perform(put("/api/admin/hero-banners/{id}", id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.headline").value("Updated Headline"))
                .andExpect(jsonPath("$.data.active").value(false));

        mockMvc.perform(get("/api/admin/hero-banners")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].headline").value("Updated Headline"));
    }

    @Test
    void delete_succeeds_andRemovesFromGetAll() throws Exception {
        String token = adminToken();
        String imageFilename = uploadTestImage(token);

        var createResult = mockMvc.perform(post("/api/admin/hero-banners")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest(imageFilename))))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(delete("/api/admin/hero-banners/{id}", id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        var getAllResult = mockMvc.perform(get("/api/admin/hero-banners")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        var dataArray = objectMapper.readTree(getAllResult.getResponse().getContentAsString()).path("data");
        boolean stillPresent = false;
        for (var node : dataArray) {
            if (node.path("id").asLong() == id) {
                stillPresent = true;
                break;
            }
        }
        assertFalse(stillPresent, "Deleted hero banner must not appear in the admin list");
    }
}
