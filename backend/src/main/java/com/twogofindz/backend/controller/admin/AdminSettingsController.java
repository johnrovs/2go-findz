package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.dto.request.SettingsRequest;
import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.SettingsResponse;
import com.twogofindz.backend.service.SettingsService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/settings")
public class AdminSettingsController {

    private final SettingsService settingsService;

    public AdminSettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public ApiResponse<SettingsResponse> get() {
        return ApiResponse.success("Settings retrieved successfully.", settingsService.getSettings());
    }

    @PutMapping
    public ApiResponse<SettingsResponse> update(@Valid @RequestBody SettingsRequest request) {
        return ApiResponse.success("Settings updated successfully.", settingsService.updateSettings(request));
    }
}
