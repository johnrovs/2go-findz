package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.ParsedProductRow;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Component
public class ProductImportValidator {

    private static final Pattern VALID_PRICE = Pattern.compile("^\\d+(\\.\\d{1,2})?$");
    private static final Pattern VALID_LINK = Pattern.compile("^https://.+");
    private static final int BRAND_MAX_LENGTH = 200;
    private static final int SKU_MAX_LENGTH = 64;

    public List<String> validate(ParsedProductRow row) {
        List<String> errors = new ArrayList<>();

        if (isBlank(row.productName())) {
            errors.add("Row " + row.rowNumber() + ": Product Name is required.");
        }
        if (isBlank(row.category())) {
            errors.add("Row " + row.rowNumber() + ": Category is required.");
        }
        validatePrice(row, errors);
        validateLink(row, errors);
        if (row.brand() != null && row.brand().length() > BRAND_MAX_LENGTH) {
            errors.add("Row " + row.rowNumber() + ": Brand must be at most " + BRAND_MAX_LENGTH + " characters.");
        }
        if (row.sku() != null && row.sku().length() > SKU_MAX_LENGTH) {
            errors.add("Row " + row.rowNumber() + ": SKU must be at most " + SKU_MAX_LENGTH + " characters.");
        }
        return errors;
    }

    public BigDecimal parsePrice(ParsedProductRow row) {
        String raw = row.priceRaw();
        if (isBlank(raw) || !VALID_PRICE.matcher(raw.trim()).matches()) {
            return null;
        }
        return new BigDecimal(raw.trim());
    }

    private void validatePrice(ParsedProductRow row, List<String> errors) {
        if (isBlank(row.priceRaw())) {
            errors.add("Row " + row.rowNumber() + ": Price is required.");
            return;
        }
        if (!VALID_PRICE.matcher(row.priceRaw().trim()).matches()) {
            errors.add("Row " + row.rowNumber() + ": Price must be a valid non-negative number.");
        }
    }

    private void validateLink(ParsedProductRow row, List<String> errors) {
        if (isBlank(row.link())) {
            return;
        }
        if (!VALID_LINK.matcher(row.link().trim()).matches()) {
            errors.add("Row " + row.rowNumber() + ": Link must be a valid https:// URL.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
