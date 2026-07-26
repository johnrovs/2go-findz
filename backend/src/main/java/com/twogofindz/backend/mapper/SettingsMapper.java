package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.SettingsResponse;
import com.twogofindz.backend.entity.SystemSettings;
import org.springframework.stereotype.Component;

@Component
public class SettingsMapper {

    public SettingsResponse toResponse(SystemSettings settings) {
        return new SettingsResponse(
                settings.getLogoImageFilename(),
                settings.getHeroImageFilename(),
                settings.getPlaceholderImageFilename(),
                settings.getTiktokUrl(),
                settings.getPinterestUrl(),
                settings.getInstagramUrl(),
                settings.getYoutubeUrl(),
                settings.getShopBio(),
                settings.getHeroHeadline(),
                settings.getHeroDescription(),
                settings.getAffiliateDisclosure(),
                settings.getContactEmail()
        );
    }
}
