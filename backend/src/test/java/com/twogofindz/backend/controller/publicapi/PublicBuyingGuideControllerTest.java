package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.request.ProductRequest;
import com.twogofindz.backend.entity.Visibility;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

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
}
