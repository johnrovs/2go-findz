package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.ComparisonFaqRequest;
import com.twogofindz.backend.dto.request.ComparisonProductRequest;
import com.twogofindz.backend.dto.request.ComparisonRequest;
import com.twogofindz.backend.dto.request.ComparisonSectionRequest;
import com.twogofindz.backend.dto.request.ComparisonSpecRowRequest;
import com.twogofindz.backend.dto.request.ComparisonSpecValueRequest;
import com.twogofindz.backend.dto.request.ProductRequest;
import com.twogofindz.backend.entity.SpecTier;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminComparisonControllerTest extends AbstractIntegrationTest {

    @Test
    void create_succeeds_withFullNestedPayload() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Test Category A");
        Long productAId = createProductId(token, categoryId, "Comparison Test Product A");
        Long productBId = createProductId(token, categoryId, "Comparison Test Product B");

        ComparisonRequest request = validRequest(categoryId, productAId, productBId, "comparison-create-test");

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Comparison Create Test"))
                .andExpect(jsonPath("$.data.slug").value("comparison-create-test"))
                .andExpect(jsonPath("$.data.products", hasSize(2)))
                .andExpect(jsonPath("$.data.products[0].product.name").value("Comparison Test Product A"))
                .andExpect(jsonPath("$.data.specRows", hasSize(1)))
                .andExpect(jsonPath("$.data.specRows[0].values", hasSize(2)))
                .andExpect(jsonPath("$.data.sections", hasSize(1)))
                .andExpect(jsonPath("$.data.faqs", hasSize(1)));
    }

    @Test
    void create_returns400_whenTitleBlank() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Test Category B");
        Long productAId = createProductId(token, categoryId, "Comparison Test Product C");
        Long productBId = createProductId(token, categoryId, "Comparison Test Product D");
        ComparisonRequest full = validRequest(categoryId, productAId, productBId, "comparison-blank-title");

        ComparisonRequest request = new ComparisonRequest(
                "", full.slug(), full.description(), full.coverImageFilename(), full.categoryId(),
                full.seoTitle(), full.seoDescription(), full.published(), full.products(),
                full.specRows(), full.sections(), full.faqs(), full.relatedComparisonIds(), full.relatedProductIds());

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists());
    }

    @Test
    void create_returns400_whenFewerThanTwoProducts() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Test Category C");
        Long productAId = createProductId(token, categoryId, "Comparison Test Product E");
        ComparisonRequest full = validRequest(categoryId, productAId, productAId, "comparison-one-product");

        ComparisonRequest request = new ComparisonRequest(
                full.title(), full.slug(), full.description(), full.coverImageFilename(), full.categoryId(),
                full.seoTitle(), full.seoDescription(), full.published(),
                List.of(full.products().get(0)),
                List.of(), List.of(), List.of(), List.of(), List.of());

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.products").exists());
    }

    @Test
    void create_returns400_whenProsProvidedWithoutCons() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Test Category D");
        Long productAId = createProductId(token, categoryId, "Comparison Test Product F");
        Long productBId = createProductId(token, categoryId, "Comparison Test Product G");

        ComparisonProductRequest badProduct = new ComparisonProductRequest(
                productAId, "Best Overall", "Great pick.", "Everyone", "Speed", "Price",
                "Fast", null, new BigDecimal("8.5"));
        ComparisonProductRequest okProduct = new ComparisonProductRequest(
                productBId, null, "Solid budget pick.", "Budget shoppers", "Price", "Speed",
                null, null, null);

        ComparisonRequest request = new ComparisonRequest(
                "Comparison Pros Cons Test", "comparison-pros-cons-test", "A test comparison.", null, categoryId,
                null, null, true,
                List.of(badProduct, okProduct), List.of(), List.of(), List.of(), List.of(), List.of());

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenSpecRowMissingValueForAProduct() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Test Category E");
        Long productAId = createProductId(token, categoryId, "Comparison Test Product H");
        Long productBId = createProductId(token, categoryId, "Comparison Test Product I");
        ComparisonRequest full = validRequest(categoryId, productAId, productBId, "comparison-incomplete-row");

        ComparisonSpecRowRequest incompleteRow = new ComparisonSpecRowRequest(
                "Performance", "Speed",
                List.of(new ComparisonSpecValueRequest(productAId, "Fast", SpecTier.BEST)));

        ComparisonRequest request = new ComparisonRequest(
                full.title(), full.slug(), full.description(), full.coverImageFilename(), full.categoryId(),
                full.seoTitle(), full.seoDescription(), full.published(), full.products(),
                List.of(incompleteRow), List.of(), List.of(), List.of(), List.of());

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns409_whenSlugAlreadyExists() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Test Category F");
        Long productAId = createProductId(token, categoryId, "Comparison Test Product J");
        Long productBId = createProductId(token, categoryId, "Comparison Test Product K");
        ComparisonRequest request = validRequest(categoryId, productAId, productBId, "comparison-duplicate-slug");

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    void create_returns401_withoutToken() throws Exception {
        ComparisonRequest request = validRequest(1L, 1L, 2L, "comparison-no-token");

        mockMvc.perform(post("/api/admin/comparisons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getById_returns404_forUnknownComparison() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/admin/comparisons/999999")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void getAll_includesCreatedComparison() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Test Category G");
        Long productAId = createProductId(token, categoryId, "Comparison Test Product L");
        Long productBId = createProductId(token, categoryId, "Comparison Test Product M");
        ComparisonRequest request = validRequest(categoryId, productAId, productBId, "comparison-list-test");

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        MvcResult result = mockMvc.perform(get("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        assertThat(result.getResponse().getContentAsString()).contains("comparison-list-test");
    }

    private ComparisonRequest validRequest(Long categoryId, Long productAId, Long productBId, String slug) {
        ComparisonProductRequest productA = new ComparisonProductRequest(
                productAId, "Best Overall", "Great overall pick.", "Everyone", "Speed", "Price",
                "Fast\nReliable", "Expensive", new BigDecimal("8.5"));
        ComparisonProductRequest productB = new ComparisonProductRequest(
                productBId, "Best Budget", "Great budget pick.", "Budget shoppers", "Price", "Speed",
                "Cheap", "Slower", new BigDecimal("7.0"));

        ComparisonSpecRowRequest specRow = new ComparisonSpecRowRequest(
                "Performance", "Speed",
                List.of(
                        new ComparisonSpecValueRequest(productAId, "Fast", SpecTier.BEST),
                        new ComparisonSpecValueRequest(productBId, "Moderate", SpecTier.STANDARD)));

        ComparisonSectionRequest section = new ComparisonSectionRequest("Buying Tips", "Consider your budget first.");
        ComparisonFaqRequest faq = new ComparisonFaqRequest("Which is better?", "It depends on your budget.");

        return new ComparisonRequest(
                titleFromSlug(slug), slug, "A test comparison used for automated testing.", null, categoryId,
                null, null, true,
                List.of(productA, productB), List.of(specRow), List.of(section), List.of(faq),
                List.of(), List.of());
    }

    private static String titleFromSlug(String slug) {
        String[] words = slug.split("-");
        StringBuilder title = new StringBuilder();
        for (String word : words) {
            title.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1)).append(' ');
        }
        return title.toString().trim();
    }

    private Long createProductId(String token, Long categoryId, String name) throws Exception {
        ProductRequest request = new ProductRequest(
                name, "Description for " + name, categoryId, null,
                new BigDecimal("19.99"), "https://example.com/" + name.replace(" ", "-"),
                false, false, true);
        MvcResult result = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("id").asLong();
    }
}
