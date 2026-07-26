package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.ClickRequest;

public interface ClickTrackingService {
    void recordClick(Long productId, ClickRequest request);
}
