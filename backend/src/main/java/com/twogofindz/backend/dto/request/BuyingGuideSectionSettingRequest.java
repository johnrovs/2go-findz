package com.twogofindz.backend.dto.request;

import com.twogofindz.backend.entity.BuyingGuideSectionKey;
import jakarta.validation.constraints.NotNull;

public record BuyingGuideSectionSettingRequest(
        @NotNull(message = "Section key is required.")
        BuyingGuideSectionKey sectionKey,

        boolean visible
) {
}
