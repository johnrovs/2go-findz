package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.SettingsRequest;
import com.twogofindz.backend.dto.response.SettingsResponse;

public interface SettingsService {
    SettingsResponse getSettings();
    SettingsResponse updateSettings(SettingsRequest request);
    String getPlaceholderImageFilename();
}
