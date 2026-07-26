package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

public record ProductRequest(
        @NotBlank(message = "Product name is required.") String name,
        @NotBlank(message = "Description is required.") String description,
        @NotNull(message = "Category is required.") Long categoryId,
        String imageFileName,

        @NotNull(message = "Price is required.")
        @DecimalMin(value = "0.00", message = "Price must be greater than or equal to zero.")
        BigDecimal productPrice,

        @NotBlank(message = "Product URL is required.")
        @Pattern(regexp = "^https://.+", message = "Product URL must be a valid HTTPS link.")
        String productLink,

        boolean trending,
        boolean bestSeller,
        boolean active
) {
}
