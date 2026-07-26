package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.SettingsResponse;
import com.twogofindz.backend.service.SettingsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/settings")
public class PublicSettingsController {

    private final SettingsService settingsService;

    public PublicSettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public ApiResponse<SettingsResponse> get() {
        return ApiResponse.success("Settings retrieved successfully.", settingsService.getSettings());
    }
}
