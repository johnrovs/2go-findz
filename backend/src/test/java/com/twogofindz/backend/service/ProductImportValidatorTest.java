package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.ParsedProductRow;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class ProductImportValidatorTest {

    private final ProductImportValidator validator = new ProductImportValidator();

    private ParsedProductRow validRow() {
        return new ParsedProductRow(2, "Serum", "Glow Labs", "GL-1", "Beauty",
                "24.99", "https://amazon.com/serum", "A serum.");
    }

    @Test
    void validate_returnsNoErrors_forACompletelyValidRow() {
        assertThat(validator.validate(validRow())).isEmpty();
    }

    @Test
    void validate_returnsNoErrors_whenOptionalFieldsAreBlank() {
        ParsedProductRow row = new ParsedProductRow(2, "Serum", null, null, "Beauty",
                "24.99", "https://amazon.com/serum", null);
        assertThat(validator.validate(row)).isEmpty();
    }

    @Test
    void validate_requiresProductName() {
        ParsedProductRow row = new ParsedProductRow(4, null, "Brand", "SKU", "Beauty",
                "9.99", "https://amazon.com/x", "Desc");
        assertThat(validator.validate(row)).containsExactly("Row 4: Product Name is required.");
    }

    @Test
    void validate_requiresCategory() {
        ParsedProductRow row = new ParsedProductRow(4, "Widget", "Brand", "SKU", "  ",
                "9.99", "https://amazon.com/x", "Desc");
        assertThat(validator.validate(row)).containsExactly("Row 4: Category is required.");
    }

    @Test
    void validate_requiresPrice() {
        ParsedProductRow row = new ParsedProductRow(4, "Widget", "Brand", "SKU", "Tools",
                null, "https://amazon.com/x", "Desc");
        assertThat(validator.validate(row)).containsExactly("Row 4: Price is required.");
    }

    @Test
    void validate_rejectsDollarPrefixedPrice() {
        ParsedProductRow row = new ParsedProductRow(4, "Widget", "Brand", "SKU", "Tools",
                "$9.99", "https://amazon.com/x", "Desc");
        assertThat(validator.validate(row)).containsExactly("Row 4: Price must be a valid non-negative number.");
    }

    @Test
    void validate_rejectsNegativePrice() {
        ParsedProductRow row = new ParsedProductRow(4, "Widget", "Brand", "SKU", "Tools",
                "-5", "https://amazon.com/x", "Desc");
        assertThat(validator.validate(row)).containsExactly("Row 4: Price must be a valid non-negative number.");
    }

    @Test
    void validate_rejectsNonNumericPrice() {
        ParsedProductRow row = new ParsedProductRow(4, "Widget", "Brand", "SKU", "Tools",
                "free", "https://amazon.com/x", "Desc");
        assertThat(validator.validate(row)).containsExactly("Row 4: Price must be a valid non-negative number.");
    }

    @Test
    void validate_requiresLink() {
        ParsedProductRow row = new ParsedProductRow(4, "Widget", "Brand", "SKU", "Tools",
                "9.99", null, "Desc");
        assertThat(validator.validate(row)).containsExactly("Row 4: Link is required.");
    }

    @Test
    void validate_rejectsNonHttpsLink() {
        ParsedProductRow row = new ParsedProductRow(4, "Widget", "Brand", "SKU", "Tools",
                "9.99", "http://amazon.com/x", "Desc");
        assertThat(validator.validate(row)).containsExactly("Row 4: Link must be a valid https:// URL.");
    }

    @Test
    void validate_rejectsOverlongBrand() {
        ParsedProductRow row = new ParsedProductRow(4, "Widget", "B".repeat(201), "SKU", "Tools",
                "9.99", "https://amazon.com/x", "Desc");
        assertThat(validator.validate(row)).containsExactly("Row 4: Brand must be at most 200 characters.");
    }

    @Test
    void validate_rejectsOverlongSku() {
        ParsedProductRow row = new ParsedProductRow(4, "Widget", "Brand", "S".repeat(65), "Tools",
                "9.99", "https://amazon.com/x", "Desc");
        assertThat(validator.validate(row)).containsExactly("Row 4: SKU must be at most 64 characters.");
    }

    @Test
    void validate_reportsMultipleErrorsOnTheSameRow() {
        ParsedProductRow row = new ParsedProductRow(4, null, "Brand", "SKU", null, "free", null, "Desc");
        assertThat(validator.validate(row)).hasSize(4);
    }

    @Test
    void parsePrice_returnsParsedValue_forAValidPrice() {
        assertThat(validator.parsePrice(validRow())).isEqualByComparingTo(new BigDecimal("24.99"));
    }

    @Test
    void parsePrice_returnsNull_forAnInvalidPrice() {
        ParsedProductRow row = new ParsedProductRow(4, "Widget", "Brand", "SKU", "Tools",
                "free", "https://amazon.com/x", "Desc");
        assertThat(validator.parsePrice(row)).isNull();
    }
}
