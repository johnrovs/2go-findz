package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ProductRequest(
        @NotBlank(message = "Product name is required.")
        @Size(max = 200, message = "Product name must be at most 200 characters.")
        String name,

        @NotBlank(message = "Description is required.") String description,
        @NotNull(message = "Category is required.") Long categoryId,

        @Size(max = 255, message = "Image file name must be at most 255 characters.")
        String imageFileName,

        @NotNull(message = "Price is required.")
        @DecimalMin(value = "0.00", message = "Price must be greater than or equal to zero.")
        BigDecimal productPrice,

        @NotBlank(message = "Product URL is required.")
        @Size(max = 2048, message = "Product URL must be at most 2048 characters.")
        @Pattern(regexp = "^https://.+", message = "Product URL must be a valid HTTPS link.")
        String productLink,

        @NotNull(message = "Trending flag is required.") Boolean trending,
        @NotNull(message = "Best seller flag is required.") Boolean bestSeller,
        @NotNull(message = "Active flag is required.") Boolean active
) {
}
