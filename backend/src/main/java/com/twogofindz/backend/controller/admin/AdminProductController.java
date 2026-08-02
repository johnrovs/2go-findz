package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.dto.request.ProductRequest;
import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.ProductResponse;
import com.twogofindz.backend.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/admin/products")
public class AdminProductController {

    private final ProductService productService;

    public AdminProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ApiResponse<Page<ProductResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) Boolean trending,
            @RequestParam(required = false) Boolean bestSeller,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ApiResponse.success("Products retrieved successfully.",
                productService.search(search, categoryId, brand, trending, bestSeller, active, minPrice, maxPrice, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<ProductResponse> getById(@PathVariable Long id) {
        return ApiResponse.success("Product retrieved successfully.", productService.getById(id));
    }

    @PostMapping
    public ApiResponse<ProductResponse> create(@Valid @RequestBody ProductRequest request) {
        return ApiResponse.success("Product created successfully.", productService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<ProductResponse> update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return ApiResponse.success("Product updated successfully.", productService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        productService.softDelete(id);
        return ApiResponse.success("Product deleted successfully.");
    }
}
