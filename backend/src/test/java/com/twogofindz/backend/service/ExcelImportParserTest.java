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
