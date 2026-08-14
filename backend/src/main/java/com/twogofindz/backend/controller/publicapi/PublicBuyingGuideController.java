package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.dto.request.GuideViewRequest;
import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideDetailResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideSummaryResponse;
import com.twogofindz.backend.service.BuyingGuideService;
import com.twogofindz.backend.service.GuideViewTrackingService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/buying-guides")
public class PublicBuyingGuideController {

    private final BuyingGuideService buyingGuideService;
    private final GuideViewTrackingService guideViewTrackingService;

    public PublicBuyingGuideController(BuyingGuideService buyingGuideService,
                                        GuideViewTrackingService guideViewTrackingService) {
        this.buyingGuideService = buyingGuideService;
        this.guideViewTrackingService = guideViewTrackingService;
    }

    @GetMapping
    public ApiResponse<List<PublicBuyingGuideSummaryResponse>> getAll() {
        return ApiResponse.success("Buying guides retrieved successfully.", buyingGuideService.getAllForPublic());
    }

    @GetMapping("/{slug}")
    public ApiResponse<PublicBuyingGuideDetailResponse> getBySlug(@PathVariable String slug) {
        return ApiResponse.success("Buying guide retrieved successfully.", buyingGuideService.getBySlugForPublic(slug));
    }

    @PostMapping("/{id}/view")
    public ApiResponse<Void> recordView(
            @PathVariable Long id,
            @RequestBody(required = false) GuideViewRequest request) {
        guideViewTrackingService.recordView(id, request);
        return ApiResponse.success("View recorded.");
    }
}
