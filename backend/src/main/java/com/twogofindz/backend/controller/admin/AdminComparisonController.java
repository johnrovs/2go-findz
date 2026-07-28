package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.dto.request.ComparisonRequest;
import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.ComparisonResponse;
import com.twogofindz.backend.dto.response.ComparisonSummaryResponse;
import com.twogofindz.backend.service.ComparisonService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/comparisons")
public class AdminComparisonController {

    private final ComparisonService comparisonService;

    public AdminComparisonController(ComparisonService comparisonService) {
        this.comparisonService = comparisonService;
    }

    @GetMapping
    public ApiResponse<List<ComparisonSummaryResponse>> getAll() {
        return ApiResponse.success("Comparisons retrieved successfully.", comparisonService.getAllForAdmin());
    }

    @GetMapping("/{id}")
    public ApiResponse<ComparisonResponse> getById(@PathVariable Long id) {
        return ApiResponse.success("Comparison retrieved successfully.", comparisonService.getByIdForAdmin(id));
    }

    @PostMapping
    public ApiResponse<ComparisonResponse> create(@Valid @RequestBody ComparisonRequest request) {
        return ApiResponse.success("Comparison created successfully.", comparisonService.create(request));
    }
}
