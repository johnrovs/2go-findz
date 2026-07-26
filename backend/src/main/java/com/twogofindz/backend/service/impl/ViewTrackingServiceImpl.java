package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.response.ViewTrackingResponse;
import com.twogofindz.backend.entity.WebsiteView;
import com.twogofindz.backend.repository.WebsiteViewRepository;
import com.twogofindz.backend.service.ViewTrackingService;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class ViewTrackingServiceImpl implements ViewTrackingService {

    private final WebsiteViewRepository websiteViewRepository;

    public ViewTrackingServiceImpl(WebsiteViewRepository websiteViewRepository) {
        this.websiteViewRepository = websiteViewRepository;
    }

    @Override
    public ViewTrackingResponse recordView() {
        String sessionId = UUID.randomUUID().toString();
        WebsiteView view = WebsiteView.builder()
                .anonymousSessionId(sessionId)
                .build();
        websiteViewRepository.save(view);
        return new ViewTrackingResponse(sessionId);
    }
}
