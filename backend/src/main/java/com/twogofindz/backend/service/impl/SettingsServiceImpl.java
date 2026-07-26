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
        applyIfPresent(request.logoImageFilename(), settings::setLogoImageFilename);
        applyIfPresent(request.heroImageFilename(), settings::setHeroImageFilename);
        applyIfPresent(request.placeholderImageFilename(), settings::setPlaceholderImageFilename);
        applyIfPresent(request.tiktokUrl(), settings::setTiktokUrl);
        applyIfPresent(request.pinterestUrl(), settings::setPinterestUrl);
        applyIfPresent(request.instagramUrl(), settings::setInstagramUrl);
        applyIfPresent(request.youtubeUrl(), settings::setYoutubeUrl);
        applyIfPresent(request.shopBio(), settings::setShopBio);
        applyIfPresent(request.heroHeadline(), settings::setHeroHeadline);
        applyIfPresent(request.heroDescription(), settings::setHeroDescription);
        applyIfPresent(request.affiliateDisclosure(), settings::setAffiliateDisclosure);
        applyIfPresent(request.contactEmail(), settings::setContactEmail);
        return settingsMapper.toResponse(settingsRepository.save(settings));
    }

    /**
     * Applies a merge-style (PATCH-like) update: a null field in the request means
     * "leave this field unchanged" rather than "clear it". This keeps the single shared
     * settings row from losing previously configured values whenever a caller updates
     * only one or two fields (e.g. just the placeholder image filename).
     */
    private void applyIfPresent(String value, java.util.function.Consumer<String> setter) {
        if (value != null) {
            setter.accept(value);
        }
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
