package com.twogofindz.backend.dto.request;

import com.twogofindz.backend.entity.SpecTier;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ComparisonSpecValueRequest(
        @NotNull(message = "Product id is required for every spec value.")
        Long productId,

        @NotBlank(message = "Spec value is required.")
        @Size(max = 200, message = "Spec value must be at most 200 characters.")
        String value,

        SpecTier tier
) {
}
