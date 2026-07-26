package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.ViewTrackingResponse;
import com.twogofindz.backend.service.ViewTrackingService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/views")
public class PublicViewController {

    private final ViewTrackingService viewTrackingService;

    public PublicViewController(ViewTrackingService viewTrackingService) {
        this.viewTrackingService = viewTrackingService;
    }

    @PostMapping
    public ApiResponse<ViewTrackingResponse> recordView() {
        return ApiResponse.success("View recorded.", viewTrackingService.recordView());
    }
}
