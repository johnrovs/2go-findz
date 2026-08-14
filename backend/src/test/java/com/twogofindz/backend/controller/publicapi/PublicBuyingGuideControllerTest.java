package com.twogofindz.backend.controller.publicapi;

import com.fasterxml.jackson.databind.JsonNode;
import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.request.ProductRequest;
import com.twogofindz.backend.entity.Visibility;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicBuyingGuideControllerTest extends AbstractIntegrationTest {

    @Test
    void getAll_returnsOnlyActiveGuides() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Public List Guide Category");

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Public Active Guide", "public-active-guide", "Excerpt", "Introduction", null,
                        categoryId, null, null, true, null, List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(), null, List.of(), null, Visibility.PUBLIC, true, true, null, null, null, "summary_large_image"))));

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Public Draft Guide", "public-draft-guide", "Excerpt", "Introduction", null,
                        categoryId, null, null, false, null, List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(), null, List.of(), null, Visibility.PUBLIC, true, true, null, null, null, "summary_large_image"))));

        mockMvc.perform(get("/api/public/buying-guides"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.title == 'Public Draft Guide')]").isEmpty())
                .andExpect(jsonPath("$.data[?(@.title == 'Public Active Guide')]").exists());
    }

    @Test
    void getBySlug_returns404_forInactiveGuide() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Public Inactive Guide Category");

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Inactive Detail Guide", "inactive-detail-guide", "Excerpt", "Introduction", null,
                        categoryId, null, null, false, null, List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(), null, List.of(), null, Visibility.PUBLIC, true, true, null, null, null, "summary_large_image"))));

        mockMvc.perform(get("/api/public/buying-guides/{slug}", "inactive-detail-guide"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getBySlug_returns404_forUnknownSlug() throws Exception {
        mockMvc.perform(get("/api/public/buying-guides/{slug}", "no-such-guide"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getBySlug_returnsActiveGuide_withRecommendedProductsInOrder() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Public Detail Guide Category");
        Long productCategoryId = createCategoryId(token, "Public Guide Product Category");
        Long firstProductId = createProductId(token, productCategoryId, "Public Guide Product A");
        Long secondProductId = createProductId(token, productCategoryId, "Public Guide Product B");

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Public Detail Guide", "public-detail-guide", "Excerpt", "Full introduction body.",
                        null, guideCategoryId, null, null, true, null,
                        List.of(secondProductId, firstProductId),
                List.of(), List.of(), List.of(), List.of(), List.of(), null, List.of(), null, Visibility.PUBLIC, true, true, null, null, null, "summary_large_image"))));

        mockMvc.perform(get("/api/public/buying-guides/{slug}", "public-detail-guide"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Public Detail Guide"))
                .andExpect(jsonPath("$.data.introduction").value("Full introduction body."))
                .andExpect(jsonPath("$.data.recommendedProducts[0].id").value(secondProductId))
                .andExpect(jsonPath("$.data.recommendedProducts[1].id").value(firstProductId));
    }

    @Test
    void recordView_incrementsGuideViewCount() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Guide View Category");
        Long guideId = createBuyingGuideId(token, "Guide View Test Guide", categoryId, true, Visibility.PUBLIC);

        mockMvc.perform(post("/api/public/buying-guides/{id}/view", guideId))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/public/buying-guides/{id}/view", guideId))
                .andExpect(status().isOk());

        var result = mockMvc.perform(get("/api/admin/dashboard/analytics")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode latestGuides = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("latestGuides");

        boolean found = false;
        for (int i = 0; i < latestGuides.size(); i++) {
            JsonNode row = latestGuides.get(i);
            if (row.path("id").asLong() == guideId) {
                found = true;
                assertEquals(2, row.path("views").asLong());
            }
        }
        assertTrue(found, "the guide should appear in latestGuides with its recorded view count");
    }

    private Long createBuyingGuideId(String token, String title, Long categoryId, boolean active,
                                      Visibility visibility) throws Exception {
        BuyingGuideRequest request = new BuyingGuideRequest(
                title, "", "Excerpt for " + title, "Introduction", null,
                categoryId, null, null, active, null, List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(), null, List.of(), null,
                visibility, true, true, null, null, null, "summary_large_image");

        var result = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }

    private Long createProductId(String token, Long categoryId, String name) throws Exception {
        var result = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ProductRequest(
                                name, "Test product for public buying guide.", categoryId, null,
                                new BigDecimal("25.00"), "https://amazon.com/dp/" + name.replace(" ", "-"),
                                false, false, true, null, null, null, null, null))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }

    @Test
    void getBySlug_returnsFullNestedStructure_withInheritedTopPickBadge() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Public Full Guide Category");
        Long productCategoryId = createCategoryId(token, "Public Full Guide Product Category");
        Long topPickProductId = createProductId(token, productCategoryId, "Public Full Guide Top Pick Product");

        String requestJson = """
                {
                  "title": "Public Full Guide", "slug": "public-full-guide",
                  "excerpt": "Excerpt", "introduction": "<p>Introduction</p>", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
                  "scheduledPublishAt": null, "supportingKeywords": [], "visibility": "PUBLIC", "robotsIndex": true, "robotsFollow": true, "twitterCardType": "summary_large_image", "recommendedProductIds": [%d],
                  "quickRecommendations": [{"productId": %d, "badgeName": "Best Overall"}],
                  "comparisonSpecs": [
                    {"specificationName": "Battery Life", "values": [{"productId": %d, "value": "40 Hrs"}]}
                  ],
                  "recommendationSections": [
                    {"productId": %d, "recommendationType": "TOP_PICK", "sectionLabel": "Our Top Pick",
                     "whyRecommended": "<p>Great value.</p>", "pros": [{"content": "Great sound"}],
                     "cons": [{"content": "Pricey"}], "bestFor": [{"content": "Daily commuters"}]}
                  ],
                  "faqs": [{"question": "Is it worth it?", "answer": "<p>Yes.</p>"}],
                  "tocEntries": [
                    {"sectionKey": null, "title": "What to Look For", "content": "<p>Look for battery life.</p>", "visible": true}
                  ]
                }
                """.formatted(guideCategoryId, topPickProductId, topPickProductId, topPickProductId, topPickProductId);

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(requestJson));

        mockMvc.perform(get("/api/public/buying-guides/{slug}", "public-full-guide"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.quickRecommendations[0].badgeName").value("Best Overall"))
                .andExpect(jsonPath("$.data.comparisonTable.specificationNames[0]").value("Battery Life"))
                .andExpect(jsonPath("$.data.topPick.sectionLabel").value("Our Top Pick"))
                .andExpect(jsonPath("$.data.topPick.badgeName").value("Best Overall"))
                .andExpect(jsonPath("$.data.topPick.pros[0]").value("Great sound"))
                .andExpect(jsonPath("$.data.faqs[0].question").value("Is it worth it?"))
                .andExpect(jsonPath("$.data.tocEntries[0].title").value("What to Look For"))
                .andExpect(jsonPath("$.data.tocEntries[0].content").value("<p>Look for battery life.</p>"))
                .andExpect(jsonPath("$.data.tocEntries[?(@.sectionKey == 'TOP_PICK')]").exists());
    }

    @Test
    void getAll_excludesUnlistedGuides() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Unlisted Guide Category");
        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Unlisted Guide", "unlisted-guide", "Excerpt", "Introduction", null,
                        guideCategoryId, null, null, true, null, List.of(),
                        List.of(), List.of(), List.of(), List.of(), List.of(),
                        null, List.of(), null, Visibility.UNLISTED, true, true, null, null, null, "summary_large_image"))));

        mockMvc.perform(get("/api/public/buying-guides"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.slug == 'unlisted-guide')]").isEmpty());
    }

    @Test
    void getBySlug_returnsGuide_forUnlistedGuide() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Unlisted Direct Guide Category");
        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Unlisted Direct Guide", "unlisted-direct-guide", "Excerpt", "Introduction", null,
                        guideCategoryId, null, null, true, null, List.of(),
                        List.of(), List.of(), List.of(), List.of(), List.of(),
                        null, List.of(), null, Visibility.UNLISTED, true, true, null, null, null, "summary_large_image"))));

        mockMvc.perform(get("/api/public/buying-guides/unlisted-direct-guide"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.slug").value("unlisted-direct-guide"));
    }

    @Test
    void getBySlug_returns404_forPrivateGuide() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Private Guide Category");
        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Private Guide", "private-guide", "Excerpt", "Introduction", null,
                        guideCategoryId, null, null, true, null, List.of(),
                        List.of(), List.of(), List.of(), List.of(), List.of(),
                        null, List.of(), null, Visibility.PRIVATE, true, true, null, null, null, "summary_large_image"))));

        mockMvc.perform(get("/api/public/buying-guides/private-guide"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getBySlug_returnsSeoAndAuditFields() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Public SEO Fields Guide Category");

        String requestJson = """
                {
                  "title": "Public SEO Fields Guide", "slug": "public-seo-fields-guide",
                  "excerpt": "Excerpt", "introduction": "<p>Introduction</p>", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": "Custom SEO Title", "seoDescription": "Custom SEO description.",
                  "active": true, "scheduledPublishAt": null, "recommendedProductIds": [],
                  "quickRecommendations": [], "comparisonSpecs": [], "recommendationSections": [],
                  "faqs": [], "tocEntries": [],
                  "focusKeyword": "wireless earbuds", "supportingKeywords": [],
                  "canonicalUrl": "https://example.com/canonical-guide",
                  "visibility": "UNLISTED", "robotsIndex": false, "robotsFollow": false,
                  "openGraphTitle": "OG Title", "openGraphDescription": "OG Description.",
                  "openGraphImageFilename": "og-image.png", "twitterCardType": "summary"
                }
                """.formatted(guideCategoryId);

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(requestJson));

        mockMvc.perform(get("/api/public/buying-guides/{slug}", "public-seo-fields-guide"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.focusKeyword").value("wireless earbuds"))
                .andExpect(jsonPath("$.data.canonicalUrl").value("https://example.com/canonical-guide"))
                .andExpect(jsonPath("$.data.visibility").value("UNLISTED"))
                .andExpect(jsonPath("$.data.robotsIndex").value(false))
                .andExpect(jsonPath("$.data.robotsFollow").value(false))
                .andExpect(jsonPath("$.data.openGraphTitle").value("OG Title"))
                .andExpect(jsonPath("$.data.openGraphDescription").value("OG Description."))
                .andExpect(jsonPath("$.data.openGraphImageFilename").value("og-image.png"))
                .andExpect(jsonPath("$.data.twitterCardType").value("summary"))
                .andExpect(jsonPath("$.data.publishedAt").exists())
                .andExpect(jsonPath("$.data.updatedAt").exists());
    }
}
