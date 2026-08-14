package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.GuideViewRequest;

public interface GuideViewTrackingService {
    void recordView(Long guideId, GuideViewRequest request);
}
