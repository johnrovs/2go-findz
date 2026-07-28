package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.PublicComparisonDetailResponse;
import com.twogofindz.backend.dto.response.PublicComparisonSummaryResponse;
import com.twogofindz.backend.service.ComparisonService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/comparisons")
public class PublicComparisonController {

    private final ComparisonService comparisonService;

    public PublicComparisonController(ComparisonService comparisonService) {
        this.comparisonService = comparisonService;
    }

    @GetMapping
    public ApiResponse<List<PublicComparisonSummaryResponse>> getAll() {
        return ApiResponse.success("Comparisons retrieved successfully.", comparisonService.getAllForPublic());
    }

    @GetMapping("/{slug}")
    public ApiResponse<PublicComparisonDetailResponse> getBySlug(@PathVariable String slug) {
        return ApiResponse.success("Comparison retrieved successfully.", comparisonService.getBySlugForPublic(slug));
    }
}
