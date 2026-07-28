package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ComparisonProductRequest(
        @NotNull(message = "Product id is required.")
        Long productId,

        @Size(max = 100, message = "Badge must be at most 100 characters.")
        String badge,

        @NotBlank(message = "Recommendation is required.")
        @Size(max = 500, message = "Recommendation must be at most 500 characters.")
        String recommendation,

        @NotBlank(message = "Best For is required.")
        @Size(max = 200, message = "Best For must be at most 200 characters.")
        String bestFor,

        @NotBlank(message = "Main strength is required.")
        @Size(max = 200, message = "Main strength must be at most 200 characters.")
        String mainStrength,

        @NotBlank(message = "Main weakness is required.")
        @Size(max = 200, message = "Main weakness must be at most 200 characters.")
        String mainWeakness,

        String pros,

        String cons,

        @DecimalMin(value = "0.0", message = "Editor's score must be between 0.0 and 10.0.")
        @DecimalMax(value = "10.0", message = "Editor's score must be between 0.0 and 10.0.")
        BigDecimal editorsScore
) {
    @AssertTrue(message = "Pros and cons must both be provided, or both left blank.")
    public boolean isProsConsConsistent() {
        boolean prosBlank = pros == null || pros.isBlank();
        boolean consBlank = cons == null || cons.isBlank();
        return prosBlank == consBlank;
    }
}
