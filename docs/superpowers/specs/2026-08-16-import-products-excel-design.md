# Import Products from Excel — Design

## Summary

Add an "Import Products" flow to the admin Products Management page. An admin uploads a `.xlsx` workbook built on a fixed 7-column template, reviews a server-validated preview (per-row Ready / Duplicate / Invalid status), confirms, and the backend imports valid, non-duplicate rows as new products — always inactive, never trending/best-seller/scheduled regardless of what the spreadsheet says. Categories referenced by name that don't already exist are auto-created, also inactive. Existing categories and products are never modified by an import.

This feature is net-new; it doesn't touch existing product/category CRUD, filters, or pagination.

## Architecture

Two independently testable halves, built as two sequential implementation plans:

1. **Backend** — Apache POI-based `.xlsx` parsing, validation, duplicate detection, category auto-creation, and two new REST endpoints under `AdminProductImportController`. Fully testable via MockMvc with programmatically-built workbook fixtures, no frontend required.
2. **Frontend** — an "Import Products" button, a modal (upload → preview → importing → results), and a new service module. Consumes the backend contract from (1).

## Backend

### New dependency

`backend/pom.xml` gains:
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

### New classes

**`service/ExcelImportParser`** — turns uploaded bytes into `List<ParsedProductRow>` (one per non-blank data row). Owns all structural and security validation:
- Worksheet must be named exactly "Products" (case-insensitive), ignoring any "How to use" sheet. Missing → `InvalidImportFileException`.
- Header row (row 1) must contain, case-insensitive/trimmed: Product Name, Brand, SKU, Category, Description, Price, Link. Missing/renamed headers → `InvalidImportFileException` naming the missing column.
- Blank rows (all cells empty) are skipped, not counted as data rows.
- Row cap: more than 1,000 non-blank data rows → whole file rejected with a clear count-exceeded error.
- Per-cell length cap: 5,000 characters. A cell exceeding this marks its row INVALID with a specific message; does not abort the whole file.
- SKU cells are always read as strings (`DataFormatter`, never numeric coercion) to preserve leading zeros.
- Price cells are read as numeric/decimal; non-numeric or `$`-prefixed text is left as raw text for the validator to reject with a row-specific message (parser itself doesn't throw on bad price — that's a per-row validation concern, not a structural one).
- Formula cells: never evaluated. Read via the cell's cached last-computed value only (`CELL_TYPE_FORMULA` branch reads `getStringCellValue()`/`getNumericCellValue()` on the cached result, `FormulaEvaluator.evaluate()` is never called).
- File-level security checks before any parsing: extension must be `.xlsx`; zip entries inspected and reject if `xl/vbaProject.bin` is present (macro-enabled workbook, defense-in-depth regardless of extension); `WorkbookFactory.create()` throwing `EncryptedDocumentException` → clear "password-protected" error; POI's built-in `ZipSecureFile` inflate-ratio guard left at conservative defaults for zip-bomb protection, backstopped by the 5MB raw upload cap (enforced before parsing starts, both via Spring's `spring.servlet.multipart.max-file-size`/`max-request-size=5MB` config and an explicit check for a friendlier error message than the framework default).

**`service/ProductImportValidator`** — pure/stateless, no Spring context required for its core logic (still a `@Component` for DI convenience). Given one `ParsedProductRow`, returns a `RowValidationResult` (list of error strings, each citing the row number per your spec's examples, e.g. `"Row 4: Product Name is required."`). Rules:
- Product Name: required, non-blank after trim.
- Category: required, non-blank after trim.
- Price: required; must parse as a non-negative decimal; reject `$`-prefixed or non-numeric text.
- Link: required; must match `^https?://.+`.
- Brand, SKU, Description: optional; when present, must respect the existing DB column limits (Brand ≤200, SKU ≤64; Description has no DB cap since the column is `TEXT`, so no length rejection there — matches the entity, not the frontend form's 500-char client-side convenience cap, which doesn't apply to bulk import).
- All text fields trimmed before validation and before use.

**`service/ProductImportDuplicateChecker`** — given the full parsed+validated row set and the existing DB, marks DUPLICATE status. Matching key priority: SKU (if present) → normalized link → normalized name+brand. Normalization: trim + lowercase for all three; link additionally strips one trailing slash. Checks two dimensions:
- **Against the DB**: one bulk query at the start of each preview/import call fetches `id`, `sku`, `productLink`, `name`, `brand` for every existing product, building an in-memory lookup keyed by the same normalized sku/link/name+brand keys used for the workbook. A single query keeps this O(1) round-trips regardless of row count, appropriate for an affiliate catalog's expected size; revisit only if the catalog grows large enough to make a full in-memory fetch impractical.
- **Within the workbook**: first occurrence of a given key (among rows that are otherwise valid) is eligible to be READY; every later row sharing that key is DUPLICATE.
Rows already marked INVALID by the validator are never checked for duplicates — INVALID takes precedence in the reported status.

**`service/ProductImportService`** — orchestrates both endpoints:
- `preview(MultipartFile file) -> ImportPreviewResponse`: parse → validate → duplicate-check. Zero DB writes. Also computes the distinct set of category names referenced by READY rows that don't already exist (case-insensitive, whitespace-collapsed match against `ProductCategoryRepository`), reported as `newCategories`.
- `importFile(MultipartFile file) -> ImportResultResponse`: parse → validate → duplicate-check (identical logic — the import endpoint never trusts client-submitted preview state, it recomputes everything from the raw file), then persists every READY row sequentially via `ProductImportRowWriter`, accumulating counts and an `issues[]` list.

**`service/ProductImportRowWriter`** — one method, `@Transactional(propagation = Propagation.REQUIRES_NEW)`:
1. Look up category by trim+whitespace-collapsed+case-insensitive name match.
2. If not found: create it (`active=false`, `commissionRate=BigDecimal("0.00")`, `imageFileName=null`) and save. Because rows are processed strictly sequentially and each row's transaction commits before the next row starts, a category created by an earlier row in the same import is already visible (and reused, never re-created) by later rows referencing the same name — no extra locking needed. The existing DB-level unique constraint on category name is the backstop against races from concurrent imports.
3. Build and save the `Product` with the row's validated fields, forcing `active=false`, `trending=false`, `bestSeller=false`, `scheduledPublishAt=null` regardless of anything in the spreadsheet (there are no trending/bestSeller/scheduled columns in the template, so this is enforcement against future template drift, not a real conflict today).
4. Returns whether a new category was created, for the caller's counters.

Because this method is its own `REQUIRES_NEW` transaction, a failure partway through (e.g. a `DataIntegrityViolationException` racing another process) rolls back only this row's category-and-product save. The outer `ProductImportService.importFile()` loop is not itself transactional — it catches each row's exception, records an `ImportRowIssue`, and continues to the next row, satisfying "one row's DB failure must be clearly reported without blocking other valid rows."

**`controller/admin/AdminProductImportController`** — `@RequestMapping("/api/admin/products/import")`:
- `POST /preview` — `@RequestParam("file") MultipartFile file` → `ApiResponse.success(..., ImportPreviewResponse)`.
- `POST` (bare path) — same param → `ApiResponse.success(..., ImportResultResponse)`.

A separate controller class (not folded into `AdminProductController`), matching the existing precedent of `AdminImageController` being separate from product CRUD. No `@PreAuthorize` needed — protected identically to every other `/api/admin/**` route via the existing `SecurityConfig` path rule.

**`exception/InvalidImportFileException`** (400) — new exception mapped in `GlobalExceptionHandler` following the existing `InvalidFileException`/`InvalidComparisonException` pattern. `MaxUploadSizeExceededException` (thrown by Spring's multipart layer when the 5MB cap is exceeded before the app even sees the file) is also mapped here to a friendly message rather than leaking a container-level error.

### New DTOs

```java
public record ImportPreviewResponse(
        String fileName,
        int totalRows,
        int readyRows,
        int duplicateRows,
        int invalidRows,
        List<String> newCategories,
        List<ImportPreviewRow> rows
) {}

public record ImportPreviewRow(
        int rowNumber,
        String productName,
        String brand,
        String sku,
        String category,
        BigDecimal price,
        String link,
        String status,      // "READY" | "DUPLICATE" | "INVALID"
        List<String> errors,
        boolean newCategory
) {}

public record ImportResultResponse(
        int totalRows,
        int importedProducts,
        int createdCategories,
        int skippedDuplicates,
        int failedRows,
        List<ImportRowIssue> issues
) {}

public record ImportRowIssue(
        int rowNumber,
        String productName,
        String sku,
        String message
) {}
```

`issues[]` in `ImportResultResponse` covers **both** skipped duplicates and failed rows (not failures only) — the frontend's downloadable error report needs both categories in one CSV per your spec ("columns Excel Row/Product Name/SKU/Error, only shown when rows were skipped/failed"), so one unified list avoids a second backend shape or a second endpoint.

### Category commission rate default

Auto-created categories get `commissionRate = 0.00` (your choice) — admin adjusts it when they review and activate the category later.

### Sample-row handling

The preview response includes no special "is this the template's sample row" flag. Instead, the frontend always renders a static reminder banner above the preview table (see Frontend section) — avoids a fragile exact-string match against your example product's name, which would silently stop working the moment someone tweaks the sample text.

## Frontend

### `Button.jsx`

New variant, generically reusable beyond this feature:
```js
outline: 'bg-white text-primary border border-primary hover:bg-primary hover:text-white',
```

### `ProductsPage.jsx`

Header row gains an "Import Products" button (outline variant, `FileUp` icon from `lucide-react`) placed before the existing "Add Product" button, opening `ImportProductsModal`. On the modal's import-complete callback: reset to page 1 while preserving the current page size, call the existing `productSearch.reload()`, show a success toast, close the modal.

### `ImportProductsModal.jsx` (new)

Built on the existing `Modal.jsx` — already provides focus trap, Escape-to-close, body-portal, `aria-modal`/`aria-labelledby`. Internal step state: `upload → preview → importing → results`. Escape-to-close and all action buttons are disabled during `importing`.

- **upload**: drag-drop zone (styled like `ImageUploader`'s dropzone variant — dashed purple border, spreadsheet icon, "Drop your Excel file here / or / Choose Excel File / Only .xlsx files up to 5MB"), client-side extension+size pre-check (server re-validates regardless — never trusted), template info panel (the 7 required columns) + "Download Template" link to the static asset, purple-tinted rules notice ("Imported products will be inactive by default. New categories will also be created as inactive."). Selecting a file auto-POSTs to preview and advances the step.
- **preview**: summary counts (Total/Ready/Duplicates/Invalid/New categories), the static sample-row reminder banner, and a semantic `<table>` of rows with a text-labeled status per row (Ready/green, Duplicate/amber, Invalid/red — never color-only). "Import N Ready Rows" button POSTs the same file to the import endpoint.
- **importing**: spinner + "Importing products...", everything disabled.
- **results**: "Import completed" summary counts, "Download Error Report" button (client-side CSV built from `issues[]`, shown only when non-empty), "Close" button.

Empty/error states surfaced inline in the modal at the relevant step: no file selected, wrong file type, oversized file, missing "Products" worksheet, empty worksheet, missing/duplicate headers, corrupted workbook, password-protected workbook, network failure, server failure — each mapped from the specific backend error message where the backend distinguishes them, or a generic retry-capable message for network/server failures.

### `frontend/src/services/adminProductImportService.js` (new)

```js
export async function previewImport(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/admin/products/import/preview', formData);
  return response.data.data;
}

export async function importProducts(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/admin/products/import', formData);
  return response.data.data;
}
```

### Static template asset

`frontend/public/templates/product-list-template.xlsx`, generated to match the provided screenshot: "Products" sheet with the 7 headers and the one sample row ("Hydrating Vitamin C Face Serum, 30ml" / "Glow Labs" / "GL-SER-VC30" / "Beauty & Skincare" / ...), plus a "How to use" sheet with brief per-column notes. Placeholder until the real file is available — swapped in place at the same path with no code change needed.

## Testing

**Backend** (MockMvc + programmatically-built `.xlsx` fixtures via POI in test setup, not checked-in binaries): valid import; missing "Products" worksheet; missing/renamed headers; empty worksheet; invalid price (non-numeric, `$`-prefixed, negative); invalid URL; duplicate SKU (against DB and within-workbook); duplicate link; duplicate row within workbook; existing-category reuse; case-insensitive category matching; automatic inactive category creation; imported products always inactive/not-trending/not-bestseller/not-scheduled regardless of sheet content; existing category status never modified by import; partial row failure doesn't block other valid rows; file-size limit; unauthorized request (no admin token) rejected; corrupted workbook; row-count cap exceeded; macro-enabled workbook rejected; password-protected workbook rejected.

**Frontend** (Vitest + RTL, mocked service module): modal open/close and Escape behavior; file selection (valid and invalid type/size); preview rendering with mixed Ready/Duplicate/Invalid rows; import summary rendering; loading/disabled state during import; successful import closes modal and triggers list refresh; server error surfaces a retry-capable message; product list refresh resets to page 1 while preserving page size.

## Explicit non-goals (carried over from your spec)

Never: activate imported products or newly-created categories; modify existing category statuses; auto-update duplicate products; process the "How to use" worksheet as data; add status columns to the Excel template; execute formulas or macros; hard-code categories; remove or alter existing product filters/pagination/CRUD actions; change unrelated backend/frontend code; break the existing Add Product form.
