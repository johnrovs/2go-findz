package com.twogofindz.backend.dto.response;

import java.util.List;

public record ImportPreviewResponse(
        String fileName,
        int totalRows,
        int readyRows,
        int duplicateRows,
        int invalidRows,
        List<String> newCategories,
        List<ImportPreviewRow> rows
) {
}
