package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.UploadResponse;
import com.twogofindz.backend.service.StorageService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/images")
public class AdminImageController {

    private final StorageService storageService;

    public AdminImageController(StorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping
    public ApiResponse<UploadResponse> upload(@RequestParam("file") MultipartFile file) {
        String filename = storageService.store(file);
        return ApiResponse.success("Image uploaded successfully.", new UploadResponse(filename));
    }
}
