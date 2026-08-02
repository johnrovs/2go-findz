package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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
        @NotNull(message = "Active flag is required.") Boolean active,

        @Size(max = 200, message = "Brand must be at most 200 characters.")
        String brand,

        @Future(message = "Scheduled publish date must be in the future.")
        LocalDateTime scheduledPublishAt,

        @DecimalMin(value = "0.0", message = "Rating must be between 0.0 and 5.0.")
        @DecimalMax(value = "5.0", message = "Rating must be between 0.0 and 5.0.")
        BigDecimal rating,

        @Min(value = 0, message = "Review count cannot be negative.")
        Integer reviewCount
) {
}
