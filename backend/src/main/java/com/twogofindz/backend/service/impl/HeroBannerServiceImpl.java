package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.HeroBannerRequest;
import com.twogofindz.backend.dto.response.HeroBannerResponse;
import com.twogofindz.backend.dto.response.PublicHeroBannerResponse;
import com.twogofindz.backend.entity.HeroBanner;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.mapper.HeroBannerMapper;
import com.twogofindz.backend.repository.HeroBannerRepository;
import com.twogofindz.backend.service.HeroBannerService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class HeroBannerServiceImpl implements HeroBannerService {

    private final HeroBannerRepository heroBannerRepository;
    private final HeroBannerMapper heroBannerMapper;

    public HeroBannerServiceImpl(HeroBannerRepository heroBannerRepository, HeroBannerMapper heroBannerMapper) {
        this.heroBannerRepository = heroBannerRepository;
        this.heroBannerMapper = heroBannerMapper;
    }

    @Override
    @Transactional
    public HeroBannerResponse create(HeroBannerRequest request) {
        HeroBanner banner = HeroBanner.builder()
                .imageFilename(request.imageFilename())
                .imageAlt(request.imageAlt())
                .badge(request.badge())
                .headline(request.headline())
                .description(request.description())
                .buttonText(request.buttonText())
                .buttonLink(request.buttonLink())
                .displayOrder(request.displayOrder())
                .active(request.active())
                .build();
        return heroBannerMapper.toResponse(heroBannerRepository.save(banner));
    }

    @Override
    @Transactional
    public HeroBannerResponse update(Long id, HeroBannerRequest request) {
        HeroBanner banner = findEntityById(id);
        banner.setImageFilename(request.imageFilename());
        banner.setImageAlt(request.imageAlt());
        banner.setBadge(request.badge());
        banner.setHeadline(request.headline());
        banner.setDescription(request.description());
        banner.setButtonText(request.buttonText());
        banner.setButtonLink(request.buttonLink());
        banner.setDisplayOrder(request.displayOrder());
        banner.setActive(request.active());
        return heroBannerMapper.toResponse(heroBannerRepository.save(banner));
    }

    @Override
    public List<HeroBannerResponse> getAllForAdmin() {
        return heroBannerRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(heroBannerMapper::toResponse)
                .toList();
    }

    @Override
    public List<PublicHeroBannerResponse> getAllForPublic() {
        return heroBannerRepository.findByActiveTrueOrderByDisplayOrderAsc().stream()
                .map(heroBannerMapper::toPublicResponse)
                .toList();
    }

    @Override
    @Transactional
    public void delete(Long id) {
        heroBannerRepository.delete(findEntityById(id));
    }

    private HeroBanner findEntityById(Long id) {
        return heroBannerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hero banner not found with id: " + id));
    }
}
