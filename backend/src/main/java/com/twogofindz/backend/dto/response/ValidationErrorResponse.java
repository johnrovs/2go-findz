package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;
import java.util.Map;

public record ValidationErrorResponse(
        boolean success,
        String message,
        Map<String, String> errors,
        LocalDateTime timestamp
) {
    public static ValidationErrorResponse of(Map<String, String> errors) {
        return new ValidationErrorResponse(false, "Validation failed.", errors, LocalDateTime.now());
    }
}
