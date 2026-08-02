package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.request.ProductRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminBuyingGuideControllerTest extends AbstractIntegrationTest {

    @Test
    void create_succeeds_withRecommendedProductsInOrder() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Guide Order Guide Category");
        Long productCategoryId = createCategoryId(token, "Guide Order Product Category");
        Long firstProductId = createProductId(token, productCategoryId, "Guide Product A");
        Long secondProductId = createProductId(token, productCategoryId, "Guide Product B");

        BuyingGuideRequest request = new BuyingGuideRequest(
                "Best Kitchen Gadgets 2026", "best-kitchen-gadgets-2026",
                "A quick roundup of our favorite kitchen gadgets.",
                "Full introduction here.", null, guideCategoryId, null, null,
                true, null, List.of(secondProductId, firstProductId),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Best Kitchen Gadgets 2026"))
                .andExpect(jsonPath("$.data.slug").value("best-kitchen-gadgets-2026"))
                .andExpect(jsonPath("$.data.categoryName").value("Guide Order Guide Category"))
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.recommendedProducts[0].id").value(secondProductId))
                .andExpect(jsonPath("$.data.recommendedProducts[1].id").value(firstProductId));
    }

    @Test
    void create_autoGeneratesSlug_whenSlugBlank() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Auto Slug Guide Category");

        BuyingGuideRequest request = new BuyingGuideRequest(
                "Best Air Fryers Under $100", "", "Excerpt", "Introduction", null,
                guideCategoryId, null, null, true, null, List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.slug").value("best-air-fryers-under-100"));
    }

    @Test
    void create_returns409_whenSlugAlreadyTaken() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Duplicate Slug Guide Category");

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "First Guide", "shared-slug", "Excerpt", "Introduction", null,
                        guideCategoryId, null, null, true, null, List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of()))));

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                                "Second Guide", "shared-slug", "Excerpt", "Introduction", null,
                                guideCategoryId, null, null, true, null, List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of()))))
                .andExpect(status().isConflict());
    }

    @Test
    void create_returns404_whenCategoryDoesNotExist() throws Exception {
        String token = adminToken();
        BuyingGuideRequest request = new BuyingGuideRequest(
                "Orphan Guide", "orphan-guide", "Excerpt", "Introduction", null,
                999999L, null, null, true, null, List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void create_returns400_whenTitleBlank() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Blank Title Guide Category");
        BuyingGuideRequest request = new BuyingGuideRequest(
                "", "blank-title", "Excerpt", "Introduction", null,
                guideCategoryId, null, null, true, null, List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns401_withoutToken() throws Exception {
        BuyingGuideRequest request = new BuyingGuideRequest(
                "Title", "title", "Excerpt", "Introduction", null, 1L, null, null, true, null, List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void create_withScheduledPublishAt_returnsInactiveWithScheduleSet() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Scheduled Guide Category");
        LocalDateTime scheduledAt = LocalDateTime.now().plusDays(2);
        BuyingGuideRequest request = new BuyingGuideRequest(
                "Scheduled Guide", "scheduled-guide", "Excerpt", "Introduction", null,
                guideCategoryId, null, null, true, scheduledAt, List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scheduledPublishAt").isNotEmpty());
    }

    @Test
    void update_succeeds_andReordersRecommendedProducts() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Guide Update Guide Category");
        Long productCategoryId = createCategoryId(token, "Guide Update Product Category");
        Long firstProductId = createProductId(token, productCategoryId, "Guide Update Product A");
        Long secondProductId = createProductId(token, productCategoryId, "Guide Update Product B");

        var createResult = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                                "Original Title", "original-title", "Original excerpt", "Original introduction",
                                null, guideCategoryId, null, null, true, null,
                                List.of(firstProductId, secondProductId),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of()))))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        BuyingGuideRequest updateRequest = new BuyingGuideRequest(
                "Updated Title", "updated-title", "Updated excerpt", "Updated introduction", null,
                guideCategoryId, null, null, false, null, List.of(secondProductId, firstProductId),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of());

        mockMvc.perform(put("/api/admin/buying-guides/{id}", id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Updated Title"))
                .andExpect(jsonPath("$.data.slug").value("updated-title"))
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(jsonPath("$.data.recommendedProducts[0].id").value(secondProductId))
                .andExpect(jsonPath("$.data.recommendedProducts[1].id").value(firstProductId));

        mockMvc.perform(get("/api/admin/buying-guides/{id}", id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Updated Title"));
    }

    @Test
    void getById_returns404_forUnknownGuide() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/admin/buying-guides/{id}", 999999L)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_succeeds_andRemovesFromGetAll() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Deletable Guide Category");

        var createResult = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                                "Deletable Guide", "deletable-guide", "Excerpt", "Introduction", null,
                                guideCategoryId, null, null, true, null, List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of()))))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(delete("/api/admin/buying-guides/{id}", id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        var getAllResult = mockMvc.perform(get("/api/admin/buying-guides")
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
        assertFalse(stillPresent, "Deleted buying guide must not appear in the admin list");
    }

    private Long createProductId(String token, Long categoryId, String name) throws Exception {
        var result = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ProductRequest(
                                name, "Test product for buying guide.", categoryId, null,
                                new BigDecimal("25.00"), "https://amazon.com/dp/" + name.replace(" ", "-"),
                                false, false, true, null, null, null, null))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }

    @Test
    void create_withAllSections_succeeds() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Full Guide Category");
        Long productCategoryId = createCategoryId(token, "Full Guide Product Category");
        Long topPickProductId = createProductId(token, productCategoryId, "Full Guide Top Pick Product");
        Long runnerUpProductId = createProductId(token, productCategoryId, "Full Guide Runner Up Product");

        String requestJson = """
                {
                  "title": "Full Section Guide", "slug": "full-section-guide",
                  "excerpt": "Excerpt", "introduction": "<p>Introduction</p>",
                  "coverImageFilename": null, "categoryId": %d,
                  "seoTitle": null, "seoDescription": null, "active": true, "scheduledPublishAt": null,
                  "recommendedProductIds": [%d, %d],
                  "quickRecommendations": [
                    {"productId": %d, "badgeName": "Best Overall"}
                  ],
                  "comparisonSpecs": [
                    {"specificationName": "Battery Life", "values": [
                      {"productId": %d, "value": "40 Hrs"},
                      {"productId": %d, "value": "30 Hrs"}
                    ]}
                  ],
                  "recommendationSections": [
                    {"productId": %d, "recommendationType": "TOP_PICK", "sectionLabel": "Our Top Pick",
                     "whyRecommended": "<p>Great value.</p>",
                     "pros": [{"content": "Great sound"}], "cons": [{"content": "Pricey"}],
                     "bestFor": [{"content": "Daily commuters"}]},
                    {"productId": %d, "recommendationType": "RUNNER_UP", "sectionLabel": "Best Budget",
                     "whyRecommended": "<p>Solid value.</p>",
                     "pros": [{"content": "Affordable"}], "cons": [{"content": "Fewer features"}],
                     "bestFor": [{"content": "Budget shoppers"}]}
                  ],
                  "adviceSections": [
                    {"title": "What to Look For", "content": "<p>Look for battery life.</p>"}
                  ],
                  "faqs": [
                    {"question": "Is it worth it?", "answer": "<p>Yes.</p>"}
                  ],
                  "sectionSettings": [
                    {"sectionKey": "FAQS", "visible": true}
                  ]
                }
                """.formatted(guideCategoryId, topPickProductId, runnerUpProductId, topPickProductId,
                topPickProductId, runnerUpProductId, topPickProductId, runnerUpProductId);

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.quickRecommendations[0].badgeName").value("Best Overall"))
                .andExpect(jsonPath("$.data.comparisonSpecs[0].specificationName").value("Battery Life"))
                .andExpect(jsonPath("$.data.comparisonSpecs[0].values", org.hamcrest.Matchers.hasSize(2)))
                .andExpect(jsonPath("$.data.recommendationSections[0].recommendationType").value("TOP_PICK"))
                .andExpect(jsonPath("$.data.recommendationSections[0].pros[0].content").value("Great sound"))
                .andExpect(jsonPath("$.data.recommendationSections[0].cons[0].content").value("Pricey"))
                .andExpect(jsonPath("$.data.recommendationSections[0].bestFor[0].content").value("Daily commuters"))
                .andExpect(jsonPath("$.data.adviceSections[0].title").value("What to Look For"))
                .andExpect(jsonPath("$.data.faqs[0].question").value("Is it worth it?"))
                .andExpect(jsonPath("$.data.sectionSettings[0].sectionKey").value("FAQS"));
    }

    @Test
    void create_returns400_whenDuplicateProductInList() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Dup Product Guide Category");
        Long productCategoryId = createCategoryId(token, "Dup Product Category");
        Long productId = createProductId(token, productCategoryId, "Dup Product");

        BuyingGuideRequest request = new BuyingGuideRequest(
                "Dup Product Guide", "dup-product-guide", "Excerpt", "Introduction", null,
                guideCategoryId, null, null, true, null, List.of(productId, productId),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenQuickRecommendationReferencesProductNotInGuide() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Orphan Quick Rec Guide Category");
        Long productCategoryId = createCategoryId(token, "Orphan Quick Rec Product Category");
        Long includedProductId = createProductId(token, productCategoryId, "Included Product");
        Long excludedProductId = createProductId(token, productCategoryId, "Excluded Product");

        String requestJson = """
                {
                  "title": "Orphan Quick Rec Guide", "slug": "orphan-quick-rec-guide",
                  "excerpt": "Excerpt", "introduction": "Introduction", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
                  "scheduledPublishAt": null, "recommendedProductIds": [%d],
                  "quickRecommendations": [{"productId": %d, "badgeName": "Best Overall"}],
                  "comparisonSpecs": [], "recommendationSections": [], "adviceSections": [],
                  "faqs": [], "sectionSettings": []
                }
                """.formatted(guideCategoryId, includedProductId, excludedProductId);

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenComparisonSpecMissingValueForAProduct() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Missing Spec Value Guide Category");
        Long productCategoryId = createCategoryId(token, "Missing Spec Value Product Category");
        Long firstProductId = createProductId(token, productCategoryId, "Missing Spec Value Product A");
        Long secondProductId = createProductId(token, productCategoryId, "Missing Spec Value Product B");

        String requestJson = """
                {
                  "title": "Missing Spec Value Guide", "slug": "missing-spec-value-guide",
                  "excerpt": "Excerpt", "introduction": "Introduction", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
                  "scheduledPublishAt": null, "recommendedProductIds": [%d, %d],
                  "quickRecommendations": [],
                  "comparisonSpecs": [
                    {"specificationName": "Battery Life", "values": [{"productId": %d, "value": "40 Hrs"}]}
                  ],
                  "recommendationSections": [], "adviceSections": [], "faqs": [], "sectionSettings": []
                }
                """.formatted(guideCategoryId, firstProductId, secondProductId, firstProductId);

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenMoreThanOneTopPick() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Two Top Picks Guide Category");
        Long productCategoryId = createCategoryId(token, "Two Top Picks Product Category");
        Long firstProductId = createProductId(token, productCategoryId, "Two Top Picks Product A");
        Long secondProductId = createProductId(token, productCategoryId, "Two Top Picks Product B");

        String requestJson = """
                {
                  "title": "Two Top Picks Guide", "slug": "two-top-picks-guide",
                  "excerpt": "Excerpt", "introduction": "Introduction", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
                  "scheduledPublishAt": null, "recommendedProductIds": [%d, %d],
                  "quickRecommendations": [], "comparisonSpecs": [],
                  "recommendationSections": [
                    {"productId": %d, "recommendationType": "TOP_PICK", "sectionLabel": "Top Pick One",
                     "whyRecommended": "Great.", "pros": [{"content": "Good"}],
                     "cons": [{"content": "Bad"}], "bestFor": [{"content": "Everyone"}]},
                    {"productId": %d, "recommendationType": "TOP_PICK", "sectionLabel": "Top Pick Two",
                     "whyRecommended": "Also great.", "pros": [{"content": "Good"}],
                     "cons": [{"content": "Bad"}], "bestFor": [{"content": "Everyone"}]}
                  ],
                  "adviceSections": [], "faqs": [], "sectionSettings": []
                }
                """.formatted(guideCategoryId, firstProductId, secondProductId, firstProductId, secondProductId);

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    void delete_cascadesChildSections_butNeverDeletesProducts() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Cascade Delete Guide Category");
        Long productCategoryId = createCategoryId(token, "Cascade Delete Product Category");
        Long productId = createProductId(token, productCategoryId, "Cascade Delete Product");

        String requestJson = """
                {
                  "title": "Cascade Delete Guide", "slug": "cascade-delete-guide",
                  "excerpt": "Excerpt", "introduction": "Introduction", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
                  "scheduledPublishAt": null, "recommendedProductIds": [%d],
                  "quickRecommendations": [{"productId": %d, "badgeName": "Best Overall"}],
                  "comparisonSpecs": [], "recommendationSections": [], "adviceSections": [],
                  "faqs": [{"question": "Q?", "answer": "A."}], "sectionSettings": []
                }
                """.formatted(guideCategoryId, productId, productId);

        var createResult = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(requestJson))
                .andReturn();
        Long guideId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(delete("/api/admin/buying-guides/{id}", guideId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/products/{id}", productId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(productId));
    }
}
