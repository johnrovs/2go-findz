package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.dto.request.ClickRequest;
import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.ProductResponse;
import com.twogofindz.backend.service.ClickTrackingService;
import com.twogofindz.backend.service.ProductService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/public/products")
public class PublicProductController {

    private final ProductService productService;
    private final ClickTrackingService clickTrackingService;

    public PublicProductController(ProductService productService, ClickTrackingService clickTrackingService) {
        this.productService = productService;
        this.clickTrackingService = clickTrackingService;
    }

    @GetMapping
    public ApiResponse<Page<ProductResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Boolean trending,
            @RequestParam(required = false) Boolean bestSeller,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @PageableDefault(size = 12, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable) {
        // Public visitors only ever see active products, regardless of any client-supplied filter.
        return ApiResponse.success("Products retrieved successfully.",
                productService.search(search, categoryId, trending, bestSeller, true, minPrice, maxPrice, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<ProductResponse> getById(@PathVariable Long id) {
        return ApiResponse.success("Product retrieved successfully.", productService.getActiveById(id));
    }

    @GetMapping("/compare")
    public ApiResponse<List<ProductResponse>> compare(@RequestParam(required = false) String ids) {
        return ApiResponse.success("Products retrieved successfully.", productService.getComparableByIds(parseIds(ids)));
    }

    @PostMapping("/{id}/click")
    public ApiResponse<Void> recordClick(
            @PathVariable Long id,
            @RequestBody(required = false) ClickRequest request) {
        clickTrackingService.recordClick(id, request);
        return ApiResponse.success("Click recorded.");
    }

    private List<Long> parseIds(String ids) {
        if (ids == null || ids.isBlank()) {
            return List.of();
        }
        return Arrays.stream(ids.split(","))
                .map(String::trim)
                .filter(token -> token.matches("\\d+"))
                .map(Long::parseLong)
                .toList();
    }
}
