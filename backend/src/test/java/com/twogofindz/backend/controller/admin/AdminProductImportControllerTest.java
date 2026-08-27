package com.twogofindz.backend.controller.admin;

import com.fasterxml.jackson.databind.JsonNode;
import com.twogofindz.backend.AbstractIntegrationTest;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
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
        Long categoryId = createCategoryId(token, "Preview Reuse Category");
        String existingProductLink = "https://amazon.com/preview-existing-product";
        createProduct(token, "Preview Existing Product", categoryId, existingProductLink);

        MockMultipartFile file = multipartFile(workbookWithRows(List.of(
                List.of("Preview New Widget", "Acme", "SKU-PREVIEW-NEW", "Preview Reuse Category", "Desc", "9.99", "https://amazon.com/preview-new-widget"),
                List.of("Preview Existing Product", "", "", "Preview Reuse Category", "Desc", "5.00", existingProductLink),
                List.of("Bad Row", "", "", "Preview Reuse Category", "Desc", "not-a-price", "https://amazon.com/bad"),
                List.of("Fresh Category Item", "", "", "Preview Brand New Category", "Desc", "3.00", "https://amazon.com/fresh")
        )));

        mockMvc.perform(multipart("/api/admin/products/import/preview")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalRows").value(4))
                .andExpect(jsonPath("$.data.readyRows").value(2))
                .andExpect(jsonPath("$.data.duplicateRows").value(1))
                .andExpect(jsonPath("$.data.invalidRows").value(1))
                .andExpect(jsonPath("$.data.newCategories[0]").value("Preview Brand New Category"))
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
                List.of("Widget", "Acme", "SKU1", "Preview Only Category", "Desc", "9.99", "https://amazon.com/widget"))));

        mockMvc.perform(multipart("/api/admin/products/import/preview")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/admin/categories")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data[?(@.productCategoryName == 'Preview Only Category')]").doesNotExist());
    }

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
                List.of("New Widget", "Acme", "SKU-NEW", "Import Created Category", "Desc", "9.99", "https://amazon.com/new-widget"))));

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

        var categoriesResult = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/admin/categories")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        JsonNode createdCategory = findCategoryByName(categoriesResult, "Import Created Category");
        assertThat(createdCategory).isNotNull();
        assertThat(createdCategory.path("active").asBoolean()).isFalse();
        assertThat(createdCategory.path("commissionRate").asDouble()).isEqualTo(0.00);
    }

    @Test
    void importProducts_allowsABlankLink_andImportsTheRowAsInactive() throws Exception {
        String token = adminToken();
        MockMultipartFile file = multipartFile(workbookWithRows(List.of(
                List.of("No Link Widget", "Acme", "SKU-NO-LINK", "Import No Link Category", "Desc", "9.99", ""))));

        mockMvc.perform(multipart("/api/admin/products/import")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalRows").value(1))
                .andExpect(jsonPath("$.data.importedProducts").value(1))
                .andExpect(jsonPath("$.data.failedRows").value(0));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/admin/products")
                        .param("search", "No Link Widget")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data.content[0].active").value(false))
                .andExpect(jsonPath("$.data.content[0].productLink").isEmpty());
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
        Long categoryId = createCategoryId(token, "Import Skip Duplicate Category");
        String link = "https://amazon.com/import-skip-duplicate-product";
        createProduct(token, "Import Skip Duplicate Product", categoryId, link);

        MockMultipartFile file = multipartFile(workbookWithRows(List.of(
                List.of("Import Skip Duplicate Product", "", "", "Import Skip Duplicate Category", "Desc", "5.00", link))));

        mockMvc.perform(multipart("/api/admin/products/import")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.importedProducts").value(0))
                .andExpect(jsonPath("$.data.skippedDuplicates").value(1))
                .andExpect(jsonPath("$.data.issues[0].rowNumber").value(2));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/admin/products")
                        .param("search", "Import Skip Duplicate Product")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    @Test
    void importProducts_reportsInvalidRowFailure_withoutBlockingOtherValidRows() throws Exception {
        String token = adminToken();
        MockMultipartFile file = multipartFile(workbookWithRows(List.of(
                List.of("Bad Row", "", "", "Import Partial Failure Category", "Desc", "not-a-price", "https://amazon.com/bad"),
                List.of("Good Row", "", "", "Import Partial Failure Category", "Desc", "5.00", "https://amazon.com/good")
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

    private JsonNode findCategoryByName(org.springframework.test.web.servlet.MvcResult result, String name) throws Exception {
        JsonNode categories = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
        for (JsonNode category : categories) {
            if (name.equals(category.path("productCategoryName").asText())) {
                return category;
            }
        }
        return null;
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
