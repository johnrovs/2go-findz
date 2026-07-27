package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.BuyingGuideResponse;
import com.twogofindz.backend.service.BuyingGuideService;
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
@RequestMapping("/api/admin/buying-guides")
public class AdminBuyingGuideController {

    private final BuyingGuideService buyingGuideService;

    public AdminBuyingGuideController(BuyingGuideService buyingGuideService) {
        this.buyingGuideService = buyingGuideService;
    }

    @GetMapping
    public ApiResponse<List<BuyingGuideResponse>> getAll() {
        return ApiResponse.success("Buying guides retrieved successfully.", buyingGuideService.getAllForAdmin());
    }

    @GetMapping("/{id}")
    public ApiResponse<BuyingGuideResponse> getById(@PathVariable Long id) {
        return ApiResponse.success("Buying guide retrieved successfully.", buyingGuideService.getByIdForAdmin(id));
    }

    @PostMapping
    public ApiResponse<BuyingGuideResponse> create(@Valid @RequestBody BuyingGuideRequest request) {
        return ApiResponse.success("Buying guide created successfully.", buyingGuideService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<BuyingGuideResponse> update(@PathVariable Long id, @Valid @RequestBody BuyingGuideRequest request) {
        return ApiResponse.success("Buying guide updated successfully.", buyingGuideService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        buyingGuideService.delete(id);
        return ApiResponse.success("Buying guide deleted successfully.");
    }
}
