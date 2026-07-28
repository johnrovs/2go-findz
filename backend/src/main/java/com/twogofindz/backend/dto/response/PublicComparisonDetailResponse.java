package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record PublicComparisonDetailResponse(
        Long id,
        String title,
        String slug,
        String description,
        String coverImageFilename,
        String categoryName,
        String seoTitle,
        String seoDescription,
        List<ComparisonProductResponse> products,
        List<ComparisonSpecRowResponse> specRows,
        List<ComparisonSectionResponse> sections,
        List<ComparisonFaqResponse> faqs,
        List<ComparisonSummaryResponse> relatedComparisons,
        List<ProductResponse> relatedProducts,
        LocalDateTime createdAt
) {
}
