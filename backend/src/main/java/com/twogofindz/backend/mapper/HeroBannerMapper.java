package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.HeroBannerResponse;
import com.twogofindz.backend.dto.response.PublicHeroBannerResponse;
import com.twogofindz.backend.entity.HeroBanner;
import org.springframework.stereotype.Component;

@Component
public class HeroBannerMapper {

    public HeroBannerResponse toResponse(HeroBanner banner) {
        return new HeroBannerResponse(
                banner.getId(),
                banner.getImageFilename(),
                banner.getImageAlt(),
                banner.getBadge(),
                banner.getHeadline(),
                banner.getDescription(),
                banner.getButtonText(),
                banner.getButtonLink(),
                banner.getDisplayOrder(),
                banner.getActive(),
                banner.getCreatedAt(),
                banner.getUpdatedAt()
        );
    }

    public PublicHeroBannerResponse toPublicResponse(HeroBanner banner) {
        return new PublicHeroBannerResponse(
                banner.getId(),
                banner.getImageFilename(),
                banner.getImageAlt(),
                banner.getBadge(),
                banner.getHeadline(),
                banner.getDescription(),
                banner.getButtonText(),
                banner.getButtonLink()
        );
    }
}
