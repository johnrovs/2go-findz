package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CategoryRequest(
        @NotBlank(message = "Category name is required.") String productCategoryName,

        @NotNull(message = "Commission rate is required.")
        @DecimalMin(value = "0.00", message = "Commission rate must be between 0 and 100.")
        @DecimalMax(value = "100.00", message = "Commission rate must be between 0 and 100.")
        BigDecimal commissionRate
) {
}
