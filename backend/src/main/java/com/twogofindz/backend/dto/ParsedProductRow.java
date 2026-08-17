package com.twogofindz.backend.dto;

public record ParsedProductRow(
        int rowNumber,
        String productName,
        String brand,
        String sku,
        String category,
        String priceRaw,
        String link,
        String description
) {
}
