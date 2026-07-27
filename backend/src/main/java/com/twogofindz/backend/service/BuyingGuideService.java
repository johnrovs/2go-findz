package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.response.BuyingGuideResponse;

import java.util.List;

public interface BuyingGuideService {
    BuyingGuideResponse create(BuyingGuideRequest request);
    BuyingGuideResponse update(Long id, BuyingGuideRequest request);
    BuyingGuideResponse getByIdForAdmin(Long id);
    void delete(Long id);
    List<BuyingGuideResponse> getAllForAdmin();
}
