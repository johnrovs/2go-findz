package com.twogofindz.backend.dto.response;

public record ImportRowIssue(
        int rowNumber,
        String productName,
        String sku,
        String message
) {
}
