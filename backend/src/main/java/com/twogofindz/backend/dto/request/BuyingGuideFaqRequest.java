package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BuyingGuideFaqRequest(
        @NotBlank(message = "Question is required.")
        @Size(max = 300, message = "Question must be at most 300 characters.")
        String question,

        @NotBlank(message = "Answer is required.")
        String answer
) {
}
