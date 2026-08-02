package com.twogofindz.backend.dto.request;

import com.twogofindz.backend.entity.BuyingGuideSectionKey;
import jakarta.validation.constraints.Size;

public record BuyingGuideTocEntryRequest(
        BuyingGuideSectionKey sectionKey,

        @Size(max = 150, message = "Section title must be at most 150 characters.")
        String title,

        String content,

        boolean visible
) {
}
