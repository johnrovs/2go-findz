package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.entity.BuyingGuideSectionKey;

public record PublicBuyingGuideTocEntryResponse(
        BuyingGuideSectionKey sectionKey,
        String title,
        String content
) {
}
