package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.ParsedProductRow;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
public class ProductImportDuplicateChecker {

    public record ExistingProductKeys(Set<String> skus, Set<String> links, Set<String> nameBrandPairs) {
        public static ExistingProductKeys empty() {
            return new ExistingProductKeys(Set.of(), Set.of(), Set.of());
        }
    }

    public static String normalizeSku(String sku) {
        return sku == null ? null : sku.trim().toLowerCase(Locale.ROOT);
    }

    public static String normalizeLink(String link) {
        if (link == null) return null;
        String normalized = link.trim().toLowerCase(Locale.ROOT);
        return normalized.endsWith("/") ? normalized.substring(0, normalized.length() - 1) : normalized;
    }

    public static String normalizeNameBrand(String name, String brand) {
        String normalizedName = name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
        String normalizedBrand = brand == null ? "" : brand.trim().toLowerCase(Locale.ROOT);
        return normalizedName + "|" + normalizedBrand;
    }

    public static String normalizeCategory(String name) {
        if (name == null) return "";
        return name.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    /**
     * Rows are assumed to already be in workbook order and pre-filtered to exclude anything
     * already marked INVALID by {@link ProductImportValidator} -- invalid rows are never
     * duplicate-checked. The first occurrence of a given key within {@code rows} is eligible to
     * be READY; every later row in the list sharing that key is reported as a duplicate.
     */
    public Set<Integer> findDuplicateRowNumbers(List<ParsedProductRow> rows, ExistingProductKeys existing) {
        Set<Integer> duplicates = new HashSet<>();
        Set<String> seenSkus = new HashSet<>();
        Set<String> seenLinks = new HashSet<>();
        Set<String> seenNameBrandPairs = new HashSet<>();

        for (ParsedProductRow row : rows) {
            String sku = normalizeSku(row.sku());
            String link = normalizeLink(row.link());
            String nameBrand = normalizeNameBrand(row.productName(), row.brand());

            boolean isDuplicate =
                    (sku != null && !sku.isBlank() && (existing.skus().contains(sku) || seenSkus.contains(sku)))
                    || (link != null && (existing.links().contains(link) || seenLinks.contains(link)))
                    || existing.nameBrandPairs().contains(nameBrand)
                    || seenNameBrandPairs.contains(nameBrand);

            if (isDuplicate) {
                duplicates.add(row.rowNumber());
            } else {
                if (sku != null && !sku.isBlank()) seenSkus.add(sku);
                if (link != null) seenLinks.add(link);
                seenNameBrandPairs.add(nameBrand);
            }
        }
        return duplicates;
    }
}
