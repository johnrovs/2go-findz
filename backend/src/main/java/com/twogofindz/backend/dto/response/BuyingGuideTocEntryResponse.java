package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.entity.BuyingGuideSectionKey;

public record BuyingGuideTocEntryResponse(
        Long id,
        BuyingGuideSectionKey sectionKey,
        String title,
        String content,
        boolean visible
) {
}
