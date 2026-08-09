package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.SettingsRequest;
import com.twogofindz.backend.dto.response.SettingsResponse;
import com.twogofindz.backend.entity.SystemSettings;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.mapper.SettingsMapper;
import com.twogofindz.backend.repository.SystemSettingsRepository;
import com.twogofindz.backend.service.SettingsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingsServiceImpl implements SettingsService {

    private static final Long SETTINGS_ID = 1L;

    private final SystemSettingsRepository settingsRepository;
    private final SettingsMapper settingsMapper;

    public SettingsServiceImpl(SystemSettingsRepository settingsRepository, SettingsMapper settingsMapper) {
        this.settingsRepository = settingsRepository;
        this.settingsMapper = settingsMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public SettingsResponse getSettings() {
        return settingsMapper.toResponse(findSettings());
    }

    @Override
    @Transactional
    public SettingsResponse updateSettings(SettingsRequest request) {
        SystemSettings settings = findSettings();
        settings.setLogoImageFilename(request.logoImageFilename());
        settings.setHeroImageFilename(request.heroImageFilename());
        settings.setPlaceholderImageFilename(request.placeholderImageFilename());
        settings.setTiktokUrl(request.tiktokUrl());
        settings.setPinterestUrl(request.pinterestUrl());
        settings.setInstagramUrl(request.instagramUrl());
        settings.setYoutubeUrl(request.youtubeUrl());
        settings.setFacebookUrl(request.facebookUrl());
        settings.setShopBio(request.shopBio());
        settings.setHeroHeadline(request.heroHeadline());
        settings.setHeroDescription(request.heroDescription());
        settings.setAffiliateDisclosure(request.affiliateDisclosure());
        settings.setContactEmail(request.contactEmail());
        return settingsMapper.toResponse(settingsRepository.save(settings));
    }

    @Override
    @Transactional(readOnly = true)
    public String getPlaceholderImageFilename() {
        return findSettings().getPlaceholderImageFilename();
    }

    private SystemSettings findSettings() {
        return settingsRepository.findById(SETTINGS_ID)
                .orElseThrow(() -> new ResourceNotFoundException("System settings have not been initialized."));
    }
}
