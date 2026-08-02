package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BuyingGuideAdviceSectionRequest(
        @NotBlank(message = "Section title is required.")
        @Size(max = 150, message = "Section title must be at most 150 characters.")
        String title,

        @NotBlank(message = "Section content is required.")
        String content
) {
}
