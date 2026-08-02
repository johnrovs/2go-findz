package com.twogofindz.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record BuyingGuideComparisonSpecRequest(
        @NotBlank(message = "Specification name is required.")
        @Size(max = 100, message = "Specification name must be at most 100 characters.")
        String specificationName,

        @NotEmpty(message = "Each specification must include at least one value.")
        @Valid
        List<BuyingGuideComparisonValueRequest> values
) {
}
