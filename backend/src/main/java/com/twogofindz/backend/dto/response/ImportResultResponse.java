package com.twogofindz.backend.dto.response;

import java.util.List;

public record ImportResultResponse(
        int totalRows,
        int importedProducts,
        int createdCategories,
        int skippedDuplicates,
        int failedRows,
        List<ImportRowIssue> issues
) {
}
