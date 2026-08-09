package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CategoryRequest(
        @NotBlank(message = "Category name is required.")
        @Size(max = 100, message = "Category name must be at most 100 characters.")
        String productCategoryName,

        @NotNull(message = "Commission rate is required.")
        @DecimalMin(value = "0.00", message = "Commission rate must be between 0 and 100.")
        @DecimalMax(value = "100.00", message = "Commission rate must be between 0 and 100.")
        @Digits(integer = 3, fraction = 2, message = "Commission rate must have at most 3 integer and 2 fraction digits.")
        BigDecimal commissionRate,

        String imageFileName
) {
}
