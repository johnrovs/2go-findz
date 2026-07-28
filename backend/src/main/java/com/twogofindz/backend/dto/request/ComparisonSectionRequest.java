package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ComparisonSectionRequest(
        @NotBlank(message = "Section heading is required.")
        @Size(max = 150, message = "Section heading must be at most 150 characters.")
        String heading,

        @NotBlank(message = "Section body is required.")
        String body
) {
}
