package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.ParsedProductRow;
import com.twogofindz.backend.exception.InvalidImportFileException;
import org.apache.poi.EncryptedDocumentException;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Component
public class ExcelImportParser {

    public static final int MAX_ROWS = 1000;
    public static final int MAX_CELL_LENGTH = 5000;
    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    private static final String REQUIRED_SHEET_NAME = "products";
    private static final List<String> REQUIRED_HEADERS =
            List.of("product name", "brand", "sku", "category", "description", "price", "link");

    public List<ParsedProductRow> parse(MultipartFile file) {
        byte[] bytes = readBytes(file);
        rejectIfMacroEnabled(bytes);

        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(bytes))) {
            Sheet sheet = findProductsSheet(workbook);
            Map<String, Integer> columnIndex = readHeaderRow(sheet);
            return readDataRows(sheet, columnIndex);
        } catch (EncryptedDocumentException e) {
            throw new InvalidImportFileException(
                    "This workbook is password-protected. Please remove the password and try again.");
        } catch (IOException e) {
            throw new InvalidImportFileException(
                    "The uploaded file could not be read. Please make sure it is a valid .xlsx workbook.");
        } catch (InvalidImportFileException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new InvalidImportFileException("The uploaded file is not a valid .xlsx workbook or is corrupted.");
        }
    }

    private byte[] readBytes(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidImportFileException("Please choose a file to import.");
        }
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
            throw new InvalidImportFileException("Only .xlsx files are supported.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new InvalidImportFileException("File exceeds the 5MB size limit.");
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new InvalidImportFileException("The uploaded file could not be read.");
        }
    }

    private void rejectIfMacroEnabled(byte[] bytes) {
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if ("xl/vbaProject.bin".equals(entry.getName())) {
                    throw new InvalidImportFileException(
                            "Macro-enabled workbooks are not supported. Please upload a plain .xlsx file.");
                }
            }
        } catch (IOException e) {
            // Not a readable zip at all -- let WorkbookFactory.create surface the "corrupted" error.
        }
    }

    private Sheet findProductsSheet(Workbook workbook) {
        for (Sheet sheet : workbook) {
            if (sheet.getSheetName().trim().equalsIgnoreCase(REQUIRED_SHEET_NAME)) {
                return sheet;
            }
        }
        throw new InvalidImportFileException("This workbook has no \"Products\" worksheet.");
    }

    private Map<String, Integer> readHeaderRow(Sheet sheet) {
        Row headerRow = sheet.getRow(0);
        if (headerRow == null) {
            throw new InvalidImportFileException("The Products worksheet is empty.");
        }
        DataFormatter formatter = new DataFormatter();
        Map<String, Integer> columnIndex = new HashMap<>();
        Set<String> seen = new HashSet<>();
        Set<String> duplicated = new HashSet<>();
        for (Cell cell : headerRow) {
            String header = formatter.formatCellValue(cell).trim().toLowerCase(Locale.ROOT);
            if (header.isEmpty()) continue;
            if (!seen.add(header)) {
                duplicated.add(header);
            }
            columnIndex.put(header, cell.getColumnIndex());
        }

        List<String> duplicatedRequired = REQUIRED_HEADERS.stream().filter(duplicated::contains).toList();
        if (!duplicatedRequired.isEmpty()) {
            throw new InvalidImportFileException("Duplicate column header(s): " + String.join(", ", duplicatedRequired) + ".");
        }
        List<String> missing = REQUIRED_HEADERS.stream().filter(h -> !columnIndex.containsKey(h)).toList();
        if (!missing.isEmpty()) {
            throw new InvalidImportFileException("Missing required column(s): " + String.join(", ", missing) + ".");
        }
        return columnIndex;
    }

    private List<ParsedProductRow> readDataRows(Sheet sheet, Map<String, Integer> columnIndex) {
        DataFormatter formatter = new DataFormatter();
        List<ParsedProductRow> rows = new ArrayList<>();

        for (int rowNum = 1; rowNum <= sheet.getLastRowNum(); rowNum++) {
            Row row = sheet.getRow(rowNum);
            if (row == null || isBlankRow(row, formatter)) continue;
            if (rows.size() >= MAX_ROWS) {
                throw new InvalidImportFileException(
                        "This file has more than " + MAX_ROWS + " rows. Please split it into smaller files.");
            }

            int excelRowNumber = rowNum + 1;
            String productName = cellText(row, columnIndex.get("product name"), formatter, excelRowNumber);
            String brand = cellText(row, columnIndex.get("brand"), formatter, excelRowNumber);
            String sku = cellText(row, columnIndex.get("sku"), formatter, excelRowNumber);
            String category = cellText(row, columnIndex.get("category"), formatter, excelRowNumber);
            String description = cellText(row, columnIndex.get("description"), formatter, excelRowNumber);
            String priceRaw = priceCellText(row, columnIndex.get("price"), excelRowNumber);
            String link = cellText(row, columnIndex.get("link"), formatter, excelRowNumber);

            rows.add(new ParsedProductRow(excelRowNumber, productName, brand, sku, category, priceRaw, link, description));
        }
        return rows;
    }

    private boolean isBlankRow(Row row, DataFormatter formatter) {
        for (Cell cell : row) {
            if (!formatter.formatCellValue(cell).trim().isEmpty()) return false;
        }
        return true;
    }

    private String cellText(Row row, Integer columnIndex, DataFormatter formatter, int rowNumber) {
        if (columnIndex == null) return null;
        Cell cell = row.getCell(columnIndex);
        if (cell == null) return null;
        String value = formatter.formatCellValue(cell).trim();
        if (value.length() > MAX_CELL_LENGTH) {
            throw new InvalidImportFileException(
                    "Row " + rowNumber + ": a cell exceeds the " + MAX_CELL_LENGTH + " character limit.");
        }
        return value.isEmpty() ? null : value;
    }

    /**
     * Read separately from {@link #cellText}: a numeric price cell must be read via
     * {@code getNumericCellValue()} and converted to a plain decimal string (no currency
     * formatting, no thousands separators) so {@code ProductImportValidator} can parse it with a
     * simple digits-only regex. A text price cell (e.g. "$24.99" typed directly) is passed through
     * verbatim so the validator can reject it for the dollar sign.
     */
    private String priceCellText(Row row, Integer columnIndex, int rowNumber) {
        if (columnIndex == null) return null;
        Cell cell = row.getCell(columnIndex);
        if (cell == null) return null;

        CellType effectiveType = cell.getCellType() == CellType.FORMULA
                ? cell.getCachedFormulaResultType()
                : cell.getCellType();
        String value = switch (effectiveType) {
            case NUMERIC -> BigDecimal.valueOf(cell.getNumericCellValue()).toPlainString();
            case STRING -> cell.getStringCellValue().trim();
            case BLANK -> null;
            default -> new DataFormatter().formatCellValue(cell).trim();
        };
        if (value != null && value.length() > MAX_CELL_LENGTH) {
            throw new InvalidImportFileException(
                    "Row " + rowNumber + ": a cell exceeds the " + MAX_CELL_LENGTH + " character limit.");
        }
        return (value == null || value.isEmpty()) ? null : value;
    }
}
