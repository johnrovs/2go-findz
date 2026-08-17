package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.ImportPreviewResponse;
import com.twogofindz.backend.dto.response.ImportResultResponse;
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

    @PostMapping
    public ApiResponse<ImportResultResponse> importProducts(@RequestParam("file") MultipartFile file) {
        return ApiResponse.success("Import completed.", productImportService.importFile(file));
    }
}
