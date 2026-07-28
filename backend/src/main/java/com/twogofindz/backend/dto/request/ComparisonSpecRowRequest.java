package com.twogofindz.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ComparisonSpecRowRequest(
        @NotBlank(message = "Group label is required.")
        @Size(max = 100, message = "Group label must be at most 100 characters.")
        String groupLabel,

        @NotBlank(message = "Row label is required.")
        @Size(max = 100, message = "Row label must be at most 100 characters.")
        String rowLabel,

        @NotEmpty(message = "Each spec row must include at least one value.")
        @Valid
        List<ComparisonSpecValueRequest> values
) {
}
