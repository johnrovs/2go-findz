package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.HeroBannerRequest;
import com.twogofindz.backend.dto.response.HeroBannerResponse;
import com.twogofindz.backend.dto.response.PublicHeroBannerResponse;

import java.util.List;

public interface HeroBannerService {
    HeroBannerResponse create(HeroBannerRequest request);
    HeroBannerResponse update(Long id, HeroBannerRequest request);
    List<HeroBannerResponse> getAllForAdmin();
    List<PublicHeroBannerResponse> getAllForPublic();
    void delete(Long id);
}
