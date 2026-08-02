package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.entity.BuyingGuideSectionKey;

public record BuyingGuideSectionSettingResponse(
        BuyingGuideSectionKey sectionKey,
        boolean visible
) {
}
