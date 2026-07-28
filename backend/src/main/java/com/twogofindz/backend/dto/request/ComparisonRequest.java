package com.twogofindz.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ComparisonRequest(
        @NotBlank(message = "Title is required.")
        @Size(max = 200, message = "Title must be at most 200 characters.")
        String title,

        @Pattern(regexp = "^$|^[a-z0-9]+(-[a-z0-9]+)*$", message = "Slug must be lowercase letters, numbers, and hyphens only.")
        @Size(max = 220, message = "Slug must be at most 220 characters.")
        String slug,

        @NotBlank(message = "Description is required.")
        @Size(max = 500, message = "Description must be at most 500 characters.")
        String description,

        @Size(max = 255, message = "Cover image filename must be at most 255 characters.")
        String coverImageFilename,

        @NotNull(message = "Category is required.")
        Long categoryId,

        @Size(max = 200, message = "SEO title must be at most 200 characters.")
        String seoTitle,

        @Size(max = 300, message = "SEO description must be at most 300 characters.")
        String seoDescription,

        @NotNull(message = "Published flag is required.")
        Boolean published,

        @NotNull(message = "Products list is required.")
        @Size(min = 2, message = "A comparison must include at least 2 products.")
        @Valid
        List<ComparisonProductRequest> products,

        @NotNull(message = "Spec rows list is required.")
        @Valid
        List<ComparisonSpecRowRequest> specRows,

        @NotNull(message = "Sections list is required.")
        @Valid
        List<ComparisonSectionRequest> sections,

        @NotNull(message = "FAQs list is required.")
        @Valid
        List<ComparisonFaqRequest> faqs,

        @NotNull(message = "Related comparisons list is required.")
        @Size(max = 8, message = "You can select at most 8 related comparisons.")
        List<Long> relatedComparisonIds,

        @NotNull(message = "Related products list is required.")
        @Size(max = 8, message = "You can select at most 8 related products.")
        List<Long> relatedProductIds
) {
}
