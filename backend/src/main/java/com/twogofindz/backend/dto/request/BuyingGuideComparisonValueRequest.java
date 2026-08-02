package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record BuyingGuideComparisonValueRequest(
        @NotNull(message = "Product id is required for every spec value.")
        Long productId,

        @NotBlank(message = "Spec value is required.")
        @Size(max = 500, message = "Spec value must be at most 500 characters.")
        String value
) {
}
