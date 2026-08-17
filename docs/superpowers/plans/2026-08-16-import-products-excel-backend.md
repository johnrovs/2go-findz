# Import Products from Excel — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two admin REST endpoints (`POST /api/admin/products/import/preview`, `POST /api/admin/products/import`) that parse an uploaded `.xlsx` workbook of products, validate and duplicate-check each row, and import valid rows as new inactive products — auto-creating any missing categories (also inactive) — without ever modifying existing products or categories.

**Architecture:** A pure parsing layer (`ExcelImportParser`) turns uploaded bytes into plain `ParsedProductRow` records with zero DB access. A pure validator (`ProductImportValidator`) and a pure duplicate-checker (`ProductImportDuplicateChecker`) operate on those records with no Spring context, DB, or file I/O — all three are unit-tested directly with JUnit, no `Testcontainers` needed. `ProductImportService` orchestrates them and talks to the DB; `ProductImportRowWriter` persists exactly one row per call inside its own `REQUIRES_NEW` transaction so a single row's failure can never roll back rows already committed earlier in the same import. Everything from the service layer down is exercised through the two new controller endpoints via `MockMvc` + `Testcontainers`, matching this codebase's existing testing convention (there are no Mockito-based service unit tests anywhere in this repo — everything is tested through its controller).

**Tech Stack:** Spring Boot 3.2.5, Java 21, Apache POI 5.3.0 (`poi` + `poi-ooxml`), JUnit 5, MockMvc, Testcontainers MySQL (via the existing `AbstractIntegrationTest`).

## Global Constraints

- Product link validation must require `https://` specifically (not `http://`), matching the existing `ProductRequest.productLink` pattern `^https://.+` — the original feature request said "http(s)"; this plan follows the codebase's established stricter convention instead, since imported products are saved as real `Product` entities and must satisfy the same rule the manual Add Product form enforces.
- Auto-created categories: `active=false`, `commissionRate=0.00`, `imageFileName=null`.
- Imported products always: `active=false`, `trending=false`, `bestSeller=false`, `scheduledPublishAt=null` — regardless of anything in the spreadsheet.
- Max upload size: 5MB (already enforced by `spring.servlet.multipart.max-file-size`/`max-request-size=5MB` in `application.yml` — no config change needed).
- Max 1,000 non-blank data rows per import.
- Max 5,000 characters per cell.
- Category name matching (both duplicate-detection and reuse-vs-create): trim + collapse internal whitespace + case-insensitive.
- SKU/link/name+brand duplicate-key normalization: trim + lowercase; link additionally strips one trailing slash.
- No `@PreAuthorize` needed on the new controller — protected identically to every other `/api/admin/**` route via the existing `SecurityConfig` path rule.
- Formula cells are read via their cached last-computed value only — never evaluated.
- Never modify an existing product or an existing category's fields during import.

---

### Task 1: Add Apache POI dependency

**Files:**
- Modify: `backend/pom.xml`

**Interfaces:**
- Produces: `org.apache.poi.ss.usermodel.*` and `org.apache.poi.xssf.usermodel.*` classes available on the classpath for every later task.

- [ ] **Step 1: Add the dependency**

Add inside `<dependencies>` in `backend/pom.xml`, after the `jsoup` dependency block:

```xml
<dependency>
  <groupId>org.apache.poi</groupId>
  <artifactId>poi</artifactId>
  <version>5.3.0</version>
</dependency>
<dependency>
  <groupId>org.apache.poi</groupId>
  <artifactId>poi-ooxml</artifactId>
  <version>5.3.0</version>
</dependency>
```

- [ ] **Step 2: Verify the build picks it up**

Run: `mvn -f backend/pom.xml compile`
Expected: `BUILD SUCCESS`, no dependency-resolution errors.

- [ ] **Step 3: Run the full existing test suite to confirm nothing broke**

Run (with Testcontainers env vars set — see this project's Docker/Colima memory notes):
```bash
export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock"
export TESTCONTAINERS_RYUK_DISABLED=true
mvn -f backend/pom.xml test
```
Expected: same pass count as before this change (no new tests yet — this step only proves the new dependency didn't break anything).

- [ ] **Step 4: Commit**

```bash
git add backend/pom.xml
git commit -m "build(backend): add Apache POI for Excel parsing"
```

---

### Task 2: Excel parsing (`ExcelImportParser`)

**Files:**
- Create: `backend/src/main/java/com/twogofindz/backend/dto/ParsedProductRow.java`
- Create: `backend/src/main/java/com/twogofindz/backend/exception/InvalidImportFileException.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/ExcelImportParser.java`
- Test: `backend/src/test/java/com/twogofindz/backend/service/ExcelImportParserTest.java`

**Interfaces:**
- Consumes: nothing from earlier tasks (only the POI dependency from Task 1).
- Produces: `ParsedProductRow(int rowNumber, String productName, String brand, String sku, String category, String priceRaw, String link, String description)`; `ExcelImportParser.parse(MultipartFile file) -> List<ParsedProductRow>`, throwing `InvalidImportFileException` for every structural/security failure. Later tasks (3, 4, 5, 6) call this method and consume `ParsedProductRow` exactly as defined here.

This is a pure component — no Spring context is needed to test it, so tests are plain JUnit 5 (no `AbstractIntegrationTest`, no Testcontainers).

- [ ] **Step 1: Write `ParsedProductRow`**

```java
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
```

- [ ] **Step 2: Write `InvalidImportFileException`**

```java
package com.twogofindz.backend.exception;

public class InvalidImportFileException extends RuntimeException {
    public InvalidImportFileException(String message) {
        super(message);
    }
}
```

- [ ] **Step 3: Write the failing tests**

```java
package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.ParsedProductRow;
import com.twogofindz.backend.exception.InvalidImportFileException;
import org.apache.poi.poifs.crypt.EncryptionInfo;
import org.apache.poi.poifs.crypt.EncryptionMode;
import org.apache.poi.poifs.crypt.Encryptor;
import org.apache.poi.poifs.filesystem.POIFSFileSystem;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ExcelImportParserTest {

    private static final List<String> HEADERS =
            List.of("Product Name", "Brand", "SKU", "Category", "Description", "Price", "Link");

    private final ExcelImportParser parser = new ExcelImportParser();

    @Test
    void parse_returnsOneRowPerNonBlankDataRow() throws Exception {
        byte[] file = workbookWithRows("Products", HEADERS, List.of(
                List.of("Serum", "Glow Labs", "GL-1", "Beauty", "A serum.", "24.99", "https://amazon.com/serum"),
                List.of("", "", "", "", "", "", ""),
                List.of("Mug", "HomeCo", "HC-1", "Home", "A mug.", "9.99", "https://amazon.com/mug")
        ));

        List<ParsedProductRow> rows = parser.parse(multipart(file));

        assertThat(rows).hasSize(2);
        assertThat(rows.get(0).rowNumber()).isEqualTo(2);
        assertThat(rows.get(0).productName()).isEqualTo("Serum");
        assertThat(rows.get(1).rowNumber()).isEqualTo(4);
    }

    @Test
    void parse_preservesSkuLeadingZeros_whenSkuIsTextCell() throws Exception {
        byte[] file = workbookWithRows("Products", HEADERS, List.of(
                List.of("Widget", "Acme", "007", "Tools", "A widget.", "5.00", "https://amazon.com/widget")
        ));

        List<ParsedProductRow> rows = parser.parse(multipart(file));

        assertThat(rows.get(0).sku()).isEqualTo("007");
    }

    @Test
    void parse_readsNumericPriceCellAsPlainDecimalString() throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Products");
            writeRow(sheet, 0, HEADERS);
            Row row = sheet.createRow(1);
            row.createCell(0).setCellValue("Widget");
            row.createCell(3).setCellValue("Tools");
            row.createCell(5).setCellValue(19.99);
            row.createCell(6).setCellValue("https://amazon.com/widget");

            List<ParsedProductRow> rows = parser.parse(multipart(toBytes(workbook)));

            assertThat(rows.get(0).priceRaw()).isEqualTo("19.99");
        }
    }

    @Test
    void parse_throws_whenProductsWorksheetIsMissing() throws Exception {
        byte[] file = workbookWithRows("Not Products", HEADERS, List.of());

        assertThatThrownBy(() -> parser.parse(multipart(file)))
                .isInstanceOf(InvalidImportFileException.class)
                .hasMessageContaining("Products");
    }

    @Test
    void parse_throws_whenARequiredHeaderIsMissing() throws Exception {
        List<String> incompleteHeaders = List.of("Product Name", "Brand", "SKU", "Category", "Description", "Price");
        byte[] file = workbookWithRows("Products", incompleteHeaders, List.of());

        assertThatThrownBy(() -> parser.parse(multipart(file)))
                .isInstanceOf(InvalidImportFileException.class)
                .hasMessageContaining("link");
    }

    @Test
    void parse_throws_whenAHeaderIsDuplicated() throws Exception {
        List<String> duplicatedHeaders =
                List.of("Product Name", "Product Name", "SKU", "Category", "Description", "Price", "Link");
        byte[] file = workbookWithRows("Products", duplicatedHeaders, List.of());

        assertThatThrownBy(() -> parser.parse(multipart(file)))
                .isInstanceOf(InvalidImportFileException.class)
                .hasMessageContaining("Duplicate");
    }

    @Test
    void parse_throws_whenWorksheetHasNoRowsAtAll() throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            workbook.createSheet("Products");
            assertThatThrownBy(() -> parser.parse(multipart(toBytes(workbook))))
                    .isInstanceOf(InvalidImportFileException.class)
                    .hasMessageContaining("empty");
        }
    }

    @Test
    void parse_throws_whenFileIsNotAValidWorkbook() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "broken.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "this is not a real xlsx file".getBytes());

        assertThatThrownBy(() -> parser.parse(file))
                .isInstanceOf(InvalidImportFileException.class);
    }

    @Test
    void parse_throws_whenExtensionIsNotXlsx() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "products.csv", "text/csv", "a,b,c".getBytes());

        assertThatThrownBy(() -> parser.parse(file))
                .isInstanceOf(InvalidImportFileException.class)
                .hasMessageContaining(".xlsx");
    }

    @Test
    void parse_throws_whenFileExceedsFiveMegabytes() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "huge.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[6 * 1024 * 1024]);

        assertThatThrownBy(() -> parser.parse(file))
                .isInstanceOf(InvalidImportFileException.class)
                .hasMessageContaining("5MB");
    }

    @Test
    void parse_throws_whenMoreThanOneThousandDataRows() throws Exception {
        List<List<String>> rows = new java.util.ArrayList<>();
        for (int i = 0; i < 1001; i++) {
            rows.add(List.of("P" + i, "Brand", "SKU" + i, "Cat", "Desc", "1.00", "https://amazon.com/" + i));
        }
        byte[] file = workbookWithRows("Products", HEADERS, rows);

        assertThatThrownBy(() -> parser.parse(multipart(file)))
                .isInstanceOf(InvalidImportFileException.class)
                .hasMessageContaining("1000");
    }

    @Test
    void parse_throws_whenACellExceedsFiveThousandCharacters() throws Exception {
        byte[] file = workbookWithRows("Products", HEADERS, List.of(
                List.of("Widget", "Acme", "SKU1", "Tools", "x".repeat(5001), "5.00", "https://amazon.com/widget")
        ));

        assertThatThrownBy(() -> parser.parse(multipart(file)))
                .isInstanceOf(InvalidImportFileException.class)
                .hasMessageContaining("Row 2");
    }

    @Test
    void parse_throws_whenWorkbookIsMacroEnabled() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            zip.putNextEntry(new ZipEntry("xl/vbaProject.bin"));
            zip.write(new byte[]{1, 2, 3});
            zip.closeEntry();
        }
        MockMultipartFile file = new MockMultipartFile(
                "file", "macro.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                out.toByteArray());

        assertThatThrownBy(() -> parser.parse(file))
                .isInstanceOf(InvalidImportFileException.class)
                .hasMessageContaining("Macro");
    }

    @Test
    void parse_throws_whenWorkbookIsPasswordProtected() throws Exception {
        ByteArrayOutputStream fileBytes = new ByteArrayOutputStream();
        try (XSSFWorkbook workbook = new XSSFWorkbook(); POIFSFileSystem fs = new POIFSFileSystem()) {
            workbook.createSheet("Products");
            EncryptionInfo info = new EncryptionInfo(EncryptionMode.standard);
            Encryptor encryptor = info.getEncryptor();
            encryptor.confirmPassword("secret");
            ByteArrayOutputStream wbBytes = new ByteArrayOutputStream();
            workbook.write(wbBytes);
            try (OutputStream cipherOut = encryptor.getDataStream(fs)) {
                cipherOut.write(wbBytes.toByteArray());
            }
            fs.writeFilesystem(fileBytes);
        }
        MockMultipartFile file = new MockMultipartFile(
                "file", "protected.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileBytes.toByteArray());

        assertThatThrownBy(() -> parser.parse(file))
                .isInstanceOf(InvalidImportFileException.class)
                .hasMessageContaining("password");
    }

    private MockMultipartFile multipart(byte[] bytes) {
        return new MockMultipartFile(
                "file", "products.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes);
    }

    private byte[] workbookWithRows(String sheetName, List<String> headers, List<List<String>> dataRows) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet(sheetName);
            writeRow(sheet, 0, headers);
            for (int i = 0; i < dataRows.size(); i++) {
                writeRow(sheet, i + 1, dataRows.get(i));
            }
            return toBytes(workbook);
        }
    }

    private void writeRow(Sheet sheet, int rowIndex, List<String> values) {
        Row row = sheet.createRow(rowIndex);
        for (int i = 0; i < values.size(); i++) {
            row.createCell(i).setCellValue(values.get(i));
        }
    }

    private byte[] toBytes(XSSFWorkbook workbook) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        return out.toByteArray();
    }
}
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `mvn -f backend/pom.xml test -Dtest=ExcelImportParserTest`
Expected: compile error (`ExcelImportParser` doesn't exist yet) or every test failing.

- [ ] **Step 5: Implement `ExcelImportParser`**

```java
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
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `mvn -f backend/pom.xml test -Dtest=ExcelImportParserTest`
Expected: all tests pass. If the password-protected test fails because `EncryptionMode.standard` doesn't trigger `EncryptedDocumentException` on read, verify with `mvn -f backend/pom.xml test -Dtest=ExcelImportParserTest#parse_throws_whenWorkbookIsPasswordProtected -X` and adjust the fixture (e.g. try `EncryptionMode.agile`) — the assertion under test (`InvalidImportFileException` with a "password" message) does not change.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/dto/ParsedProductRow.java \
        backend/src/main/java/com/twogofindz/backend/exception/InvalidImportFileException.java \
        backend/src/main/java/com/twogofindz/backend/service/ExcelImportParser.java \
        backend/src/test/java/com/twogofindz/backend/service/ExcelImportParserTest.java
git commit -m "feat(products): add ExcelImportParser for .xlsx product imports"
```

---

### Task 3: Row validation (`ProductImportValidator`)

**Files:**
- Create: `backend/src/main/java/com/twogofindz/backend/service/ProductImportValidator.java`
- Test: `backend/src/test/java/com/twogofindz/backend/service/ProductImportValidatorTest.java`

**Interfaces:**
- Consumes: `ParsedProductRow` from Task 2.
- Produces: `ProductImportValidator.validate(ParsedProductRow row) -> List<String>` (empty list = row is valid); `ProductImportValidator.parsePrice(ParsedProductRow row) -> BigDecimal` (returns `null` if the row's price isn't a valid non-negative number). Tasks 5 and 6 call both methods.

- [ ] **Step 1: Write the failing tests**

```java
package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.ParsedProductRow;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `mvn -f backend/pom.xml test -Dtest=ProductImportValidatorTest`
Expected: compile error (`ProductImportValidator` doesn't exist yet).

- [ ] **Step 3: Implement `ProductImportValidator`**

```java
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
            errors.add("Row " + row.rowNumber() + ": Link is required.");
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `mvn -f backend/pom.xml test -Dtest=ProductImportValidatorTest`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/service/ProductImportValidator.java \
        backend/src/test/java/com/twogofindz/backend/service/ProductImportValidatorTest.java
git commit -m "feat(products): add ProductImportValidator for import row validation"
```

---

### Task 4: Duplicate and category-name matching (`ProductImportDuplicateChecker`)

**Files:**
- Create: `backend/src/main/java/com/twogofindz/backend/service/ProductImportDuplicateChecker.java`
- Test: `backend/src/test/java/com/twogofindz/backend/service/ProductImportDuplicateCheckerTest.java`

**Interfaces:**
- Consumes: `ParsedProductRow` from Task 2.
- Produces:
  - `ProductImportDuplicateChecker.ExistingProductKeys(Set<String> skus, Set<String> links, Set<String> nameBrandPairs)` with `ExistingProductKeys.empty()`.
  - `ProductImportDuplicateChecker.normalizeSku(String) -> String`, `.normalizeLink(String) -> String`, `.normalizeNameBrand(String name, String brand) -> String`, `.normalizeCategory(String) -> String` — all `public static`.
  - `findDuplicateRowNumbers(List<ParsedProductRow> rows, ExistingProductKeys existing) -> Set<Integer>`.
  Tasks 5 and 6 call all of these; Task 6's `ProductImportRowWriter` also uses `normalizeCategory` directly.

- [ ] **Step 1: Write the failing tests**

```java
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `mvn -f backend/pom.xml test -Dtest=ProductImportDuplicateCheckerTest`
Expected: compile error (`ProductImportDuplicateChecker` doesn't exist yet).

- [ ] **Step 3: Implement `ProductImportDuplicateChecker`**

```java
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `mvn -f backend/pom.xml test -Dtest=ProductImportDuplicateCheckerTest`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/service/ProductImportDuplicateChecker.java \
        backend/src/test/java/com/twogofindz/backend/service/ProductImportDuplicateCheckerTest.java
git commit -m "feat(products): add ProductImportDuplicateChecker for import duplicate detection"
```

---

### Task 5: Preview endpoint (`ProductImportService.preview`, `AdminProductImportController`)

**Files:**
- Create: `backend/src/main/java/com/twogofindz/backend/dto/ImportRowStatus.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/ImportPreviewRow.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/ImportPreviewResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/ProductImportService.java`
- Create: `backend/src/main/java/com/twogofindz/backend/controller/admin/AdminProductImportController.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/exception/GlobalExceptionHandler.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminProductImportControllerTest.java`

**Interfaces:**
- Consumes: `ExcelImportParser.parse` (Task 2), `ProductImportValidator.validate`/`.parsePrice` (Task 3), `ProductImportDuplicateChecker.findDuplicateRowNumbers`/`.normalizeCategory` (Task 4).
- Produces: `ImportRowStatus { READY, DUPLICATE, INVALID }`; `ImportPreviewRow(int rowNumber, String productName, String brand, String sku, String category, BigDecimal price, String link, ImportRowStatus status, List<String> errors, boolean newCategory)`; `ImportPreviewResponse(String fileName, int totalRows, int readyRows, int duplicateRows, int invalidRows, List<String> newCategories, List<ImportPreviewRow> rows)`; `ProductImportService.preview(MultipartFile file) -> ImportPreviewResponse`. `POST /api/admin/products/import/preview`. Task 6 reuses `ImportRowStatus` and adds the sibling `importFile` method to `ProductImportService` plus the bare `POST /api/admin/products/import` endpoint on this same controller.

This task is verified through the real endpoint via `MockMvc` + `Testcontainers`, matching every other controller test in this codebase (there are no isolated service-layer unit tests anywhere in this repo).

- [ ] **Step 1: Write `ImportRowStatus`**

```java
package com.twogofindz.backend.dto;

public enum ImportRowStatus {
    READY, DUPLICATE, INVALID
}
```

- [ ] **Step 2: Write `ImportPreviewRow` and `ImportPreviewResponse`**

```java
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
```

```java
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
```

- [ ] **Step 3: Write the failing test**

```java
package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminProductImportControllerTest extends AbstractIntegrationTest {

    private static final List<String> HEADERS =
            List.of("Product Name", "Brand", "SKU", "Category", "Description", "Price", "Link");

    @Test
    void preview_returns401_withoutToken() throws Exception {
        MockMultipartFile file = multipartFile(workbookWithRows(List.of(
                List.of("Widget", "Acme", "SKU1", "Tools", "Desc", "9.99", "https://amazon.com/widget"))));

        mockMvc.perform(multipart("/api/admin/products/import/preview").file(file))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void preview_returns400_whenProductsWorksheetIsMissing() throws Exception {
        String token = adminToken();
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            workbook.createSheet("Not Products");
            MockMultipartFile file = multipartFile(toBytes(workbook));

            mockMvc.perform(multipart("/api/admin/products/import/preview")
                            .file(file)
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));
        }
    }

    @Test
    void preview_returns400_whenFileExceedsFiveMegabytes() throws Exception {
        String token = adminToken();
        MockMultipartFile file = new MockMultipartFile(
                "file", "huge.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[6 * 1024 * 1024]);

        mockMvc.perform(multipart("/api/admin/products/import/preview")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void preview_reportsReadyDuplicateAndInvalidRowsWithCorrectCounts() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Existing Category");
        String existingProductLink = "https://amazon.com/existing-product";
        createProduct(token, "Existing Product", categoryId, existingProductLink);

        MockMultipartFile file = multipartFile(workbookWithRows(List.of(
                List.of("New Widget", "Acme", "SKU-NEW", "Existing Category", "Desc", "9.99", "https://amazon.com/new-widget"),
                List.of("Existing Product", "", "", "Existing Category", "Desc", "5.00", existingProductLink),
                List.of("Bad Row", "", "", "Existing Category", "Desc", "not-a-price", "https://amazon.com/bad"),
                List.of("Fresh Category Item", "", "", "Brand New Category", "Desc", "3.00", "https://amazon.com/fresh")
        )));

        mockMvc.perform(multipart("/api/admin/products/import/preview")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalRows").value(4))
                .andExpect(jsonPath("$.data.readyRows").value(2))
                .andExpect(jsonPath("$.data.duplicateRows").value(1))
                .andExpect(jsonPath("$.data.invalidRows").value(1))
                .andExpect(jsonPath("$.data.newCategories[0]").value("Brand New Category"))
                .andExpect(jsonPath("$.data.rows[0].status").value("READY"))
                .andExpect(jsonPath("$.data.rows[1].status").value("DUPLICATE"))
                .andExpect(jsonPath("$.data.rows[2].status").value("INVALID"))
                .andExpect(jsonPath("$.data.rows[2].errors[0]").value("Row 4: Price must be a valid non-negative number."))
                .andExpect(jsonPath("$.data.rows[3].newCategory").value(true));
    }

    @Test
    void preview_doesNotPersistAnything() throws Exception {
        String token = adminToken();
        MockMultipartFile file = multipartFile(workbookWithRows(List.of(
                List.of("Widget", "Acme", "SKU1", "Brand New Category", "Desc", "9.99", "https://amazon.com/widget"))));

        mockMvc.perform(multipart("/api/admin/products/import/preview")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/admin/categories")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data[?(@.productCategoryName == 'Brand New Category')]").doesNotExist());
    }

    private MockMultipartFile multipartFile(byte[] bytes) {
        return new MockMultipartFile(
                "file", "products.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes);
    }

    private byte[] workbookWithRows(List<List<String>> dataRows) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Products");
            writeRow(sheet, 0, HEADERS);
            for (int i = 0; i < dataRows.size(); i++) {
                writeRow(sheet, i + 1, dataRows.get(i));
            }
            return toBytes(workbook);
        }
    }

    private void writeRow(Sheet sheet, int rowIndex, List<String> values) {
        Row row = sheet.createRow(rowIndex);
        for (int i = 0; i < values.size(); i++) {
            row.createCell(i).setCellValue(values.get(i));
        }
    }

    private byte[] toBytes(XSSFWorkbook workbook) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        return out.toByteArray();
    }

    private void createProduct(String token, String name, Long categoryId, String link) throws Exception {
        String body = objectMapper.writeValueAsString(new com.twogofindz.backend.dto.request.ProductRequest(
                name, "Desc", categoryId, null, new BigDecimal("10.00"), link,
                false, false, true, null, null, null, 0, null));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
    }
}
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `mvn -f backend/pom.xml test -Dtest=AdminProductImportControllerTest`
Expected: compile error (`ProductImportService`, `AdminProductImportController` don't exist yet).

- [ ] **Step 5: Implement `ProductImportService.preview`, `AdminProductImportController`, and the `GlobalExceptionHandler` mapping**

```java
package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.ImportRowStatus;
import com.twogofindz.backend.dto.ParsedProductRow;
import com.twogofindz.backend.dto.response.ImportPreviewResponse;
import com.twogofindz.backend.dto.response.ImportPreviewRow;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import com.twogofindz.backend.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

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
    private final ProductRepository productRepository;
    private final ProductCategoryRepository categoryRepository;

    public ProductImportService(ExcelImportParser parser,
                                 ProductImportValidator validator,
                                 ProductImportDuplicateChecker duplicateChecker,
                                 ProductRepository productRepository,
                                 ProductCategoryRepository categoryRepository) {
        this.parser = parser;
        this.validator = validator;
        this.duplicateChecker = duplicateChecker;
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
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

    /** Package-private: shared by {@code preview} and, once Task 6 adds it, {@code importFile}. */
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
```

```java
package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.ImportPreviewResponse;
import com.twogofindz.backend.service.ProductImportService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/products/import")
public class AdminProductImportController {

    private final ProductImportService productImportService;

    public AdminProductImportController(ProductImportService productImportService) {
        this.productImportService = productImportService;
    }

    @PostMapping("/preview")
    public ApiResponse<ImportPreviewResponse> preview(@RequestParam("file") MultipartFile file) {
        return ApiResponse.success("Import preview generated.", productImportService.preview(file));
    }
}
```

Add to `GlobalExceptionHandler.java` (alongside the existing `handleInvalidFile`/`handleInvalidComparison` handlers, e.g. right after `handleInvalidComparison`):

```java
@ExceptionHandler(InvalidImportFileException.class)
public ResponseEntity<ApiResponse<Void>> handleInvalidImportFile(InvalidImportFileException ex) {
    return ResponseEntity.badRequest().body(ApiResponse.failure(ex.getMessage()));
}
```

Add the import at the top of `GlobalExceptionHandler.java`:

```java
import com.twogofindz.backend.exception.InvalidImportFileException;
```

(This import will already be redundant with the class's own package if `InvalidImportFileException` lives in the same `com.twogofindz.backend.exception` package as `GlobalExceptionHandler` — in that case omit the import line entirely, since it's created in Task 2 under exactly that package.)

- [ ] **Step 6: Run the test to verify it passes**

Run: `mvn -f backend/pom.xml test -Dtest=AdminProductImportControllerTest`
Expected: all tests pass.

- [ ] **Step 7: Run the full backend suite**

Run:
```bash
export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock"
export TESTCONTAINERS_RYUK_DISABLED=true
mvn -f backend/pom.xml test
```
Expected: all tests pass, including every pre-existing test.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/dto/ImportRowStatus.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/ImportPreviewRow.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/ImportPreviewResponse.java \
        backend/src/main/java/com/twogofindz/backend/service/ProductImportService.java \
        backend/src/main/java/com/twogofindz/backend/controller/admin/AdminProductImportController.java \
        backend/src/main/java/com/twogofindz/backend/exception/GlobalExceptionHandler.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminProductImportControllerTest.java
git commit -m "feat(products): add product import preview endpoint"
```

---

### Task 6: Import endpoint (`ProductImportRowWriter`, `ProductImportService.importFile`)

**Files:**
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/ImportRowIssue.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/ImportResultResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/ProductImportRowWriter.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/ProductImportService.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/controller/admin/AdminProductImportController.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminProductImportControllerTest.java`

**Interfaces:**
- Consumes: `ProductImportService.evaluateRows` and every Task 2-5 interface listed above; `ProductImportRowWriter.importRow(ParsedProductRow row, BigDecimal price) -> boolean` (returns whether a new category was created).
- Produces: `ImportRowIssue(int rowNumber, String productName, String sku, String message)`; `ImportResultResponse(int totalRows, int importedProducts, int createdCategories, int skippedDuplicates, int failedRows, List<ImportRowIssue> issues)`; `ProductImportService.importFile(MultipartFile file) -> ImportResultResponse`. `POST /api/admin/products/import`.

- [ ] **Step 1: Write `ImportRowIssue` and `ImportResultResponse`**

```java
package com.twogofindz.backend.dto.response;

public record ImportRowIssue(
        int rowNumber,
        String productName,
        String sku,
        String message
) {
}
```

```java
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
```

- [ ] **Step 2: Add the failing tests to `AdminProductImportControllerTest`**

Append these test methods to the existing `AdminProductImportControllerTest` class from Task 5:

```java
    @Test
    void importProducts_returns401_withoutToken() throws Exception {
        MockMultipartFile file = multipartFile(workbookWithRows(List.of(
                List.of("Widget", "Acme", "SKU1", "Tools", "Desc", "9.99", "https://amazon.com/widget"))));

        mockMvc.perform(multipart("/api/admin/products/import").file(file))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void importProducts_createsInactiveProducts_andInactiveZeroCommissionCategories() throws Exception {
        String token = adminToken();
        MockMultipartFile file = multipartFile(workbookWithRows(List.of(
                List.of("New Widget", "Acme", "SKU-NEW", "Brand New Category", "Desc", "9.99", "https://amazon.com/new-widget"))));

        mockMvc.perform(multipart("/api/admin/products/import")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalRows").value(1))
                .andExpect(jsonPath("$.data.importedProducts").value(1))
                .andExpect(jsonPath("$.data.createdCategories").value(1))
                .andExpect(jsonPath("$.data.skippedDuplicates").value(0))
                .andExpect(jsonPath("$.data.failedRows").value(0));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/admin/products")
                        .param("search", "New Widget")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data.content[0].active").value(false))
                .andExpect(jsonPath("$.data.content[0].trending").value(false))
                .andExpect(jsonPath("$.data.content[0].bestSeller").value(false));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/admin/categories")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data[?(@.productCategoryName == 'Brand New Category')].active[0]").value(false))
                .andExpect(jsonPath("$.data[?(@.productCategoryName == 'Brand New Category')].commissionRate[0]").value(0.00));
    }

    @Test
    void importProducts_reusesExistingCategory_caseInsensitively_withoutChangingItsStatus() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Beauty");
        // createCategoryId creates the category as active=true with a 5.00% commission rate,
        // matching the AbstractIntegrationTest helper's existing behaviour.
        MockMultipartFile file = multipartFile(workbookWithRows(List.of(
                List.of("Serum", "Glow Labs", "SKU-1", "BEAUTY", "Desc", "24.99", "https://amazon.com/serum"))));

        mockMvc.perform(multipart("/api/admin/products/import")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.createdCategories").value(0))
                .andExpect(jsonPath("$.data.importedProducts").value(1));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/admin/categories/{id}", categoryId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.commissionRate").value(5.00));
    }

    @Test
    void importProducts_skipsDuplicates_withoutCreatingOrModifyingAnything() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Existing Category");
        String link = "https://amazon.com/existing-product";
        createProduct(token, "Existing Product", categoryId, link);

        MockMultipartFile file = multipartFile(workbookWithRows(List.of(
                List.of("Existing Product", "", "", "Existing Category", "Desc", "5.00", link))));

        mockMvc.perform(multipart("/api/admin/products/import")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.importedProducts").value(0))
                .andExpect(jsonPath("$.data.skippedDuplicates").value(1))
                .andExpect(jsonPath("$.data.issues[0].rowNumber").value(2));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/admin/products")
                        .param("search", "Existing Product")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    @Test
    void importProducts_reportsInvalidRowFailure_withoutBlockingOtherValidRows() throws Exception {
        String token = adminToken();
        MockMultipartFile file = multipartFile(workbookWithRows(List.of(
                List.of("Bad Row", "", "", "Brand New Category", "Desc", "not-a-price", "https://amazon.com/bad"),
                List.of("Good Row", "", "", "Brand New Category", "Desc", "5.00", "https://amazon.com/good")
        )));

        mockMvc.perform(multipart("/api/admin/products/import")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalRows").value(2))
                .andExpect(jsonPath("$.data.importedProducts").value(1))
                .andExpect(jsonPath("$.data.failedRows").value(1))
                .andExpect(jsonPath("$.data.issues[0].rowNumber").value(2));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/admin/products")
                        .param("search", "Good Row")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `mvn -f backend/pom.xml test -Dtest=AdminProductImportControllerTest`
Expected: compile error (`importFile` doesn't exist on `ProductImportService` yet, and the controller has no bare `POST` mapping).

- [ ] **Step 4: Implement `ProductImportRowWriter`**

```java
package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.ParsedProductRow;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import com.twogofindz.backend.repository.ProductRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Component
public class ProductImportRowWriter {

    private final ProductCategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public ProductImportRowWriter(ProductCategoryRepository categoryRepository, ProductRepository productRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }

    /**
     * Saves one import row as a new inactive product, auto-creating its category (also inactive,
     * 0.00% commission) if no existing category matches by trim+whitespace-collapsed+case-insensitive
     * name. Runs in its own {@code REQUIRES_NEW} transaction so a failure here rolls back only this
     * row's category-and-product save, never rows already committed earlier in the same import.
     * Categories are fetched fresh (not cached) on every call: since rows are processed strictly
     * sequentially and each row's transaction commits before the next row starts, a category
     * created by an earlier row is already visible here and reused rather than re-created.
     *
     * @return whether a new category was created for this row.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean importRow(ParsedProductRow row, BigDecimal price) {
        String normalizedCategoryName = ProductImportDuplicateChecker.normalizeCategory(row.category());
        ProductCategory category = categoryRepository.findAll().stream()
                .filter(existing -> ProductImportDuplicateChecker
                        .normalizeCategory(existing.getProductCategoryName())
                        .equals(normalizedCategoryName))
                .findFirst()
                .orElse(null);

        boolean createdCategory = false;
        if (category == null) {
            category = categoryRepository.save(ProductCategory.builder()
                    .productCategoryName(row.category().trim())
                    .commissionRate(new BigDecimal("0.00"))
                    .active(false)
                    .build());
            createdCategory = true;
        }

        Product product = Product.builder()
                .name(row.productName().trim())
                .description(row.description() != null ? row.description().trim() : "")
                .category(category)
                .productPrice(price)
                .productLink(row.link().trim())
                .trending(false)
                .bestSeller(false)
                .active(false)
                .brand(row.brand() != null ? row.brand().trim() : null)
                .scheduledPublishAt(null)
                .reviewCount(0)
                .sku(row.sku() != null ? row.sku().trim() : null)
                .build();
        productRepository.save(product);

        return createdCategory;
    }
}
```

- [ ] **Step 5: Add `importFile` to `ProductImportService`**

Add the constructor parameter and field for `ProductImportRowWriter`, and this new method, to the `ProductImportService` class created in Task 5:

```java
    // Add to the constructor's parameter list and field assignments:
    private final ProductImportRowWriter rowWriter;

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
```

Add the corresponding imports at the top of `ProductImportService.java`:

```java
import com.twogofindz.backend.dto.response.ImportResultResponse;
import com.twogofindz.backend.dto.response.ImportRowIssue;
import java.math.BigDecimal;
```

- [ ] **Step 6: Add the bare `POST` mapping to `AdminProductImportController`**

```java
    @PostMapping
    public ApiResponse<ImportResultResponse> importProducts(@RequestParam("file") MultipartFile file) {
        return ApiResponse.success("Import completed.", productImportService.importFile(file));
    }
```

Add the import: `import com.twogofindz.backend.dto.response.ImportResultResponse;`

- [ ] **Step 7: Run the tests to verify they pass**

Run: `mvn -f backend/pom.xml test -Dtest=AdminProductImportControllerTest`
Expected: all tests pass.

- [ ] **Step 8: Run the full backend suite**

Run:
```bash
export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock"
export TESTCONTAINERS_RYUK_DISABLED=true
mvn -f backend/pom.xml test
```
Expected: all tests pass, including every pre-existing test (backend total should now be 169 pre-existing + all new tests added across Tasks 2–6).

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/dto/response/ImportRowIssue.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/ImportResultResponse.java \
        backend/src/main/java/com/twogofindz/backend/service/ProductImportRowWriter.java \
        backend/src/main/java/com/twogofindz/backend/service/ProductImportService.java \
        backend/src/main/java/com/twogofindz/backend/controller/admin/AdminProductImportController.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminProductImportControllerTest.java
git commit -m "feat(products): add product import endpoint"
```

---

## Definition of Done

- `mvn -f backend/pom.xml test` passes in full, including every test added in Tasks 2–6.
- `POST /api/admin/products/import/preview` and `POST /api/admin/products/import` both exist, are protected by the existing admin auth gate, and match the JSON contract in the design spec.
- No existing product/category endpoint, entity, or test was modified beyond the one `GlobalExceptionHandler` addition in Task 5.
- Ready for the frontend plan (`docs/superpowers/plans/2026-08-16-import-products-excel-frontend.md`) to consume this exact contract.
