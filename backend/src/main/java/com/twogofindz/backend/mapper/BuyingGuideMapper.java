package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.BuyingGuideResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideDetailResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideSummaryResponse;
import com.twogofindz.backend.entity.BuyingGuide;
import org.springframework.stereotype.Component;

@Component
public class BuyingGuideMapper {

    private final ProductMapper productMapper;

    public BuyingGuideMapper(ProductMapper productMapper) {
        this.productMapper = productMapper;
    }

    public BuyingGuideResponse toResponse(BuyingGuide guide) {
        return new BuyingGuideResponse(
                guide.getId(),
                guide.getTitle(),
                guide.getExcerpt(),
                guide.getContent(),
                guide.getCoverImageFilename(),
                guide.getActive(),
                guide.getRecommendedProducts().stream().map(productMapper::toResponse).toList(),
                guide.getCreatedAt(),
                guide.getUpdatedAt()
        );
    }

    public PublicBuyingGuideSummaryResponse toPublicSummary(BuyingGuide guide) {
        return new PublicBuyingGuideSummaryResponse(
                guide.getId(),
                guide.getTitle(),
                guide.getExcerpt(),
                guide.getCoverImageFilename(),
                guide.getCreatedAt()
        );
    }

    public PublicBuyingGuideDetailResponse toPublicDetail(BuyingGuide guide) {
        return new PublicBuyingGuideDetailResponse(
                guide.getId(),
                guide.getTitle(),
                guide.getContent(),
                guide.getCoverImageFilename(),
                guide.getCreatedAt(),
                guide.getRecommendedProducts().stream().map(productMapper::toResponse).toList()
        );
    }
}
