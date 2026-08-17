package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.ImportRowStatus;
import com.twogofindz.backend.dto.ParsedProductRow;
import com.twogofindz.backend.dto.response.ImportPreviewResponse;
import com.twogofindz.backend.dto.response.ImportPreviewRow;
import com.twogofindz.backend.dto.response.ImportResultResponse;
import com.twogofindz.backend.dto.response.ImportRowIssue;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import com.twogofindz.backend.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ProductImportService {

    private final ExcelImportParser parser;
    private final ProductImportValidator validator;
    private final ProductImportDuplicateChecker duplicateChecker;
    private final ProductImportRowWriter rowWriter;
    private final ProductRepository productRepository;
    private final ProductCategoryRepository categoryRepository;

    public ProductImportService(ExcelImportParser parser,
                                 ProductImportValidator validator,
                                 ProductImportDuplicateChecker duplicateChecker,
                                 ProductImportRowWriter rowWriter,
                                 ProductRepository productRepository,
                                 ProductCategoryRepository categoryRepository) {
        this.parser = parser;
        this.validator = validator;
        this.duplicateChecker = duplicateChecker;
        this.rowWriter = rowWriter;
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    public ImportResultResponse importFile(MultipartFile file) {
        List<ParsedProductRow> rows = parser.parse(file);
        RowEvaluation evaluation = evaluateRows(rows);

        int imported = 0;
        int createdCategories = 0;
        int skippedDuplicates = 0;
        int failed = 0;
        List<ImportRowIssue> issues = new ArrayList<>();

        for (ParsedProductRow row : rows) {
            List<String> errors = evaluation.errorsByRow().get(row.rowNumber());
            if (!errors.isEmpty()) {
                failed++;
                issues.add(new ImportRowIssue(row.rowNumber(), row.productName(), row.sku(), String.join(" ", errors)));
                continue;
            }
            if (evaluation.duplicateRowNumbers().contains(row.rowNumber())) {
                skippedDuplicates++;
                issues.add(new ImportRowIssue(row.rowNumber(), row.productName(), row.sku(),
                        "Skipped: this product already exists (matched by SKU, link, or name and brand)."));
                continue;
            }
            try {
                BigDecimal price = validator.parsePrice(row);
                boolean createdCategory = rowWriter.importRow(row, price);
                imported++;
                if (createdCategory) createdCategories++;
            } catch (RuntimeException e) {
                failed++;
                issues.add(new ImportRowIssue(row.rowNumber(), row.productName(), row.sku(),
                        "Failed to save: " + e.getMessage()));
            }
        }

        return new ImportResultResponse(rows.size(), imported, createdCategories, skippedDuplicates, failed, issues);
    }

    public ImportPreviewResponse preview(MultipartFile file) {
        List<ParsedProductRow> rows = parser.parse(file);
        RowEvaluation evaluation = evaluateRows(rows);

        List<ImportPreviewRow> previewRows = new ArrayList<>();
        int ready = 0;
        int duplicate = 0;
        int invalid = 0;
        Set<String> newCategoryDisplayNames = new LinkedHashSet<>();

        for (ParsedProductRow row : rows) {
            List<String> errors = evaluation.errorsByRow().get(row.rowNumber());
            ImportRowStatus status;
            if (!errors.isEmpty()) {
                status = ImportRowStatus.INVALID;
                invalid++;
            } else if (evaluation.duplicateRowNumbers().contains(row.rowNumber())) {
                status = ImportRowStatus.DUPLICATE;
                duplicate++;
            } else {
                status = ImportRowStatus.READY;
                ready++;
            }

            boolean isNewCategory = status == ImportRowStatus.READY
                    && evaluation.newCategoryNames().contains(ProductImportDuplicateChecker.normalizeCategory(row.category()));
            if (isNewCategory) {
                newCategoryDisplayNames.add(row.category().trim());
            }

            previewRows.add(new ImportPreviewRow(row.rowNumber(), row.productName(), row.brand(), row.sku(),
                    row.category(), validator.parsePrice(row), row.link(), status, errors, isNewCategory));
        }

        return new ImportPreviewResponse(file.getOriginalFilename(), rows.size(), ready, duplicate, invalid,
                List.copyOf(newCategoryDisplayNames), previewRows);
    }

    /** Package-private: shared by {@code preview} and {@code importFile}. */
    RowEvaluation evaluateRows(List<ParsedProductRow> rows) {
        Map<Integer, List<String>> errorsByRow = new HashMap<>();
        for (ParsedProductRow row : rows) {
            errorsByRow.put(row.rowNumber(), validator.validate(row));
        }

        List<ParsedProductRow> validRows = rows.stream()
                .filter(row -> errorsByRow.get(row.rowNumber()).isEmpty())
                .toList();

        ProductImportDuplicateChecker.ExistingProductKeys existingKeys = loadExistingProductKeys();
        Set<Integer> duplicateRowNumbers = duplicateChecker.findDuplicateRowNumbers(validRows, existingKeys);

        Set<String> existingCategoryNames = new HashSet<>();
        categoryRepository.findAll().forEach(category ->
                existingCategoryNames.add(ProductImportDuplicateChecker.normalizeCategory(category.getProductCategoryName())));

        Set<String> newCategoryNames = new HashSet<>();
        for (ParsedProductRow row : validRows) {
            if (duplicateRowNumbers.contains(row.rowNumber())) continue;
            String normalized = ProductImportDuplicateChecker.normalizeCategory(row.category());
            if (!existingCategoryNames.contains(normalized)) {
                newCategoryNames.add(normalized);
            }
        }

        return new RowEvaluation(errorsByRow, duplicateRowNumbers, newCategoryNames);
    }

    private ProductImportDuplicateChecker.ExistingProductKeys loadExistingProductKeys() {
        List<Product> existingProducts = productRepository.findAll();
        Set<String> skus = new HashSet<>();
        Set<String> links = new HashSet<>();
        Set<String> nameBrandPairs = new HashSet<>();
        for (Product product : existingProducts) {
            String sku = ProductImportDuplicateChecker.normalizeSku(product.getSku());
            if (sku != null && !sku.isBlank()) skus.add(sku);
            links.add(ProductImportDuplicateChecker.normalizeLink(product.getProductLink()));
            nameBrandPairs.add(ProductImportDuplicateChecker.normalizeNameBrand(product.getName(), product.getBrand()));
        }
        return new ProductImportDuplicateChecker.ExistingProductKeys(skus, links, nameBrandPairs);
    }

    record RowEvaluation(Map<Integer, List<String>> errorsByRow, Set<Integer> duplicateRowNumbers,
                          Set<String> newCategoryNames) {
    }
}
