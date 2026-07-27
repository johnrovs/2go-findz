package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record BuyingGuideRequest(
        @NotBlank(message = "Title is required.")
        @Size(max = 200, message = "Title must be at most 200 characters.")
        String title,

        @NotBlank(message = "Excerpt is required.")
        @Size(max = 500, message = "Excerpt must be at most 500 characters.")
        String excerpt,

        @NotBlank(message = "Content is required.")
        String content,

        @Size(max = 255, message = "Cover image filename must be at most 255 characters.")
        String coverImageFilename,

        @NotNull(message = "Active flag is required.")
        Boolean active,

        @NotNull(message = "Recommended products list is required.")
        List<Long> recommendedProductIds
) {
}
