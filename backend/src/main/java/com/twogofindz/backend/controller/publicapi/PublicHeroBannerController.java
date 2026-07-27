package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.PublicHeroBannerResponse;
import com.twogofindz.backend.service.HeroBannerService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/hero-banners")
public class PublicHeroBannerController {

    private final HeroBannerService heroBannerService;

    public PublicHeroBannerController(HeroBannerService heroBannerService) {
        this.heroBannerService = heroBannerService;
    }

    @GetMapping
    public ApiResponse<List<PublicHeroBannerResponse>> getAll() {
        return ApiResponse.success("Hero banners retrieved successfully.", heroBannerService.getAllForPublic());
    }
}
