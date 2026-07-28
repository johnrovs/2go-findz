package com.twogofindz.backend.controller.publicapi;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicComparisonControllerTest extends AbstractIntegrationTest {

    @Test
    void getAll_returnsOnlyPublishedComparisons() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Public Comparison Category A");
        Long productAId = createProductId(token, categoryId, "Public Comparison Product A");
        Long productBId = createProductId(token, categoryId, "Public Comparison Product B");

        createComparison(token, categoryId, productAId, productBId, "public-comparison-published", true);
        createComparison(token, categoryId, productAId, productBId, "public-comparison-draft", false);

        mockMvc.perform(get("/api/public/comparisons"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.slug == 'public-comparison-published')]").exists())
                .andExpect(jsonPath("$.data[?(@.slug == 'public-comparison-draft')]").doesNotExist());
    }

    @Test
    void getBySlug_returns404_forDraftComparison() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Public Comparison Category B");
        Long productAId = createProductId(token, categoryId, "Public Comparison Product C");
        Long productBId = createProductId(token, categoryId, "Public Comparison Product D");
        createComparison(token, categoryId, productAId, productBId, "public-comparison-draft-detail", false);

        mockMvc.perform(get("/api/public/comparisons/public-comparison-draft-detail"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getBySlug_returns404_forUnknownSlug() throws Exception {
        mockMvc.perform(get("/api/public/comparisons/does-not-exist"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getBySlug_returnsPublishedComparison_withFullNestedStructure() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Public Comparison Category C");
        Long productAId = createProductId(token, categoryId, "Public Comparison Product E");
        Long productBId = createProductId(token, categoryId, "Public Comparison Product F");
        createComparison(token, categoryId, productAId, productBId, "public-comparison-full-detail", true);

        mockMvc.perform(get("/api/public/comparisons/public-comparison-full-detail"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Public Comparison Full Detail"))
                .andExpect(jsonPath("$.data.products.length()").value(2))
                .andExpect(jsonPath("$.data.specRows.length()").value(1))
                .andExpect(jsonPath("$.data.sections.length()").value(1))
                .andExpect(jsonPath("$.data.faqs.length()").value(1));
    }

    private void createComparison(String token, Long categoryId, Long productAId, Long productBId,
                                   String slug, boolean published) throws Exception {
        ComparisonProductRequest productA = new ComparisonProductRequest(
                productAId, "Best Overall", "Great overall pick.", "Everyone", "Speed", "Price",
                "Fast", "Expensive", new BigDecimal("8.5"));
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

        String[] words = slug.split("-");
        StringBuilder title = new StringBuilder();
        for (String word : words) {
            title.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1)).append(' ');
        }

        ComparisonRequest request = new ComparisonRequest(
                title.toString().trim(), slug, "A test comparison used for automated testing.", null, categoryId,
                null, null, published,
                List.of(productA, productB), List.of(specRow), List.of(section), List.of(faq),
                List.of(), List.of());

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
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
