package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.dto.ImportRowStatus;

import java.math.BigDecimal;
import java.util.List;

public record ImportPreviewRow(
        int rowNumber,
        String productName,
        String brand,
        String sku,
        String category,
        BigDecimal price,
        String link,
        ImportRowStatus status,
        List<String> errors,
        boolean newCategory
) {
}
