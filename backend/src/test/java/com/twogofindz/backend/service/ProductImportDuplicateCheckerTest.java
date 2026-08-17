package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.ParsedProductRow;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class ProductImportDuplicateCheckerTest {

    private final ProductImportDuplicateChecker checker = new ProductImportDuplicateChecker();

    private ParsedProductRow row(int rowNumber, String name, String brand, String sku, String link) {
        return new ParsedProductRow(rowNumber, name, brand, sku, "Category", "9.99", link, "Desc");
    }

    @Test
    void findDuplicateRowNumbers_flagsRowMatchingExistingDbSku() {
        var existing = new ProductImportDuplicateChecker.ExistingProductKeys(
                Set.of("gl-1"), Set.of(), Set.of());
        List<ParsedProductRow> rows = List.of(row(2, "Serum", "Glow Labs", "GL-1", "https://amazon.com/serum"));

        assertThat(checker.findDuplicateRowNumbers(rows, existing)).containsExactly(2);
    }

    @Test
    void findDuplicateRowNumbers_flagsRowMatchingExistingDbLink_caseInsensitiveAndTrailingSlash() {
        var existing = new ProductImportDuplicateChecker.ExistingProductKeys(
                Set.of(), Set.of("https://amazon.com/serum"), Set.of());
        List<ParsedProductRow> rows = List.of(row(2, "Serum", "Glow Labs", null, "HTTPS://Amazon.com/Serum/"));

        assertThat(checker.findDuplicateRowNumbers(rows, existing)).containsExactly(2);
    }

    @Test
    void findDuplicateRowNumbers_flagsRowMatchingExistingDbNameAndBrand() {
        var existing = new ProductImportDuplicateChecker.ExistingProductKeys(
                Set.of(), Set.of(), Set.of("serum|glow labs"));
        List<ParsedProductRow> rows = List.of(row(2, "Serum", "Glow Labs", null, "https://amazon.com/new-link"));

        assertThat(checker.findDuplicateRowNumbers(rows, existing)).containsExactly(2);
    }

    @Test
    void findDuplicateRowNumbers_flagsSecondRowSharingAnSkuWithinTheSameWorkbook() {
        List<ParsedProductRow> rows = List.of(
                row(2, "Serum", "Glow Labs", "GL-1", "https://amazon.com/serum"),
                row(3, "Serum Refill", "Glow Labs", "GL-1", "https://amazon.com/serum-refill"));

        assertThat(checker.findDuplicateRowNumbers(rows, ProductImportDuplicateChecker.ExistingProductKeys.empty()))
                .containsExactly(3);
    }

    @Test
    void findDuplicateRowNumbers_doesNotFlagDistinctRows() {
        List<ParsedProductRow> rows = List.of(
                row(2, "Serum", "Glow Labs", "GL-1", "https://amazon.com/serum"),
                row(3, "Mug", "HomeCo", "HC-1", "https://amazon.com/mug"));

        assertThat(checker.findDuplicateRowNumbers(rows, ProductImportDuplicateChecker.ExistingProductKeys.empty()))
                .isEmpty();
    }

    @Test
    void normalizeCategory_trimsCollapsesWhitespaceAndLowercases() {
        assertThat(ProductImportDuplicateChecker.normalizeCategory("  Beauty   &  Skincare "))
                .isEqualTo("beauty & skincare");
    }

    @Test
    void normalizeLink_stripsOneTrailingSlash() {
        assertThat(ProductImportDuplicateChecker.normalizeLink("https://amazon.com/x/"))
                .isEqualTo("https://amazon.com/x");
    }
}
