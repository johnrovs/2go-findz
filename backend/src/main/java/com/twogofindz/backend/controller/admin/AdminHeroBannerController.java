package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.dto.request.HeroBannerRequest;
import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.HeroBannerResponse;
import com.twogofindz.backend.service.HeroBannerService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/hero-banners")
public class AdminHeroBannerController {

    private final HeroBannerService heroBannerService;

    public AdminHeroBannerController(HeroBannerService heroBannerService) {
        this.heroBannerService = heroBannerService;
    }

    @GetMapping
    public ApiResponse<List<HeroBannerResponse>> getAll() {
        return ApiResponse.success("Hero banners retrieved successfully.", heroBannerService.getAllForAdmin());
    }

    @PostMapping
    public ApiResponse<HeroBannerResponse> create(@Valid @RequestBody HeroBannerRequest request) {
        return ApiResponse.success("Hero banner created successfully.", heroBannerService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<HeroBannerResponse> update(@PathVariable Long id, @Valid @RequestBody HeroBannerRequest request) {
        return ApiResponse.success("Hero banner updated successfully.", heroBannerService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        heroBannerService.delete(id);
        return ApiResponse.success("Hero banner deleted successfully.");
    }
}
