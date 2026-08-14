package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.GuideViewRequest;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.BuyingGuideView;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.repository.BuyingGuideRepository;
import com.twogofindz.backend.repository.BuyingGuideViewRepository;
import com.twogofindz.backend.service.GuideViewTrackingService;
import org.springframework.stereotype.Service;

@Service
public class GuideViewTrackingServiceImpl implements GuideViewTrackingService {

    private final BuyingGuideViewRepository buyingGuideViewRepository;
    private final BuyingGuideRepository buyingGuideRepository;

    public GuideViewTrackingServiceImpl(BuyingGuideViewRepository buyingGuideViewRepository,
                                         BuyingGuideRepository buyingGuideRepository) {
        this.buyingGuideViewRepository = buyingGuideViewRepository;
        this.buyingGuideRepository = buyingGuideRepository;
    }

    @Override
    public void recordView(Long guideId, GuideViewRequest request) {
        BuyingGuide guide = buyingGuideRepository.findById(guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Buying guide not found with id: " + guideId));

        BuyingGuideView view = BuyingGuideView.builder()
                .buyingGuide(guide)
                .anonymousSessionId(request == null ? null : request.sessionId())
                .build();
        buyingGuideViewRepository.save(view);
    }
}
