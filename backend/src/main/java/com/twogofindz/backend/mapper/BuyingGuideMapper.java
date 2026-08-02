package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.BuyingGuideAdviceSectionResponse;
import com.twogofindz.backend.dto.response.BuyingGuideComparisonSpecResponse;
import com.twogofindz.backend.dto.response.BuyingGuideComparisonValueResponse;
import com.twogofindz.backend.dto.response.BuyingGuideFaqResponse;
import com.twogofindz.backend.dto.response.BuyingGuideQuickRecommendationResponse;
import com.twogofindz.backend.dto.response.BuyingGuideRecommendationItemResponse;
import com.twogofindz.backend.dto.response.BuyingGuideRecommendationSectionResponse;
import com.twogofindz.backend.dto.response.BuyingGuideResponse;
import com.twogofindz.backend.dto.response.BuyingGuideSectionSettingResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideAdviceSectionResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideComparisonRowResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideComparisonTableResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideDetailResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideFaqResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideQuickRecommendationResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideRecommendationSectionResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideSummaryResponse;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.BuyingGuideAdviceSection;
import com.twogofindz.backend.entity.BuyingGuideComparisonSpec;
import com.twogofindz.backend.entity.BuyingGuideComparisonValue;
import com.twogofindz.backend.entity.BuyingGuideFaq;
import com.twogofindz.backend.entity.BuyingGuideQuickRecommendation;
import com.twogofindz.backend.entity.BuyingGuideRecommendationSection;
import com.twogofindz.backend.entity.BuyingGuideSectionKey;
import com.twogofindz.backend.entity.BuyingGuideSectionSetting;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.RecommendationItemType;
import com.twogofindz.backend.entity.RecommendationType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class BuyingGuideMapper {

    private static final List<BuyingGuideSectionKey> DEFAULT_SECTION_ORDER = List.of(
            BuyingGuideSectionKey.QUICK_RECOMMENDATIONS, BuyingGuideSectionKey.COMPARISON_TABLE,
            BuyingGuideSectionKey.TOP_PICK, BuyingGuideSectionKey.RUNNER_UPS,
            BuyingGuideSectionKey.BUYING_ADVICE, BuyingGuideSectionKey.FAQS);

    private final ProductMapper productMapper;

    public BuyingGuideMapper(ProductMapper productMapper) {
        this.productMapper = productMapper;
    }

    public BuyingGuideResponse toResponse(BuyingGuide guide) {
        return new BuyingGuideResponse(
                guide.getId(),
                guide.getTitle(),
                guide.getSlug(),
                guide.getExcerpt(),
                guide.getIntroduction(),
                guide.getCoverImageFilename(),
                guide.getCategory() != null ? guide.getCategory().getId() : null,
                guide.getCategory() != null ? guide.getCategory().getProductCategoryName() : null,
                guide.getSeoTitle(),
                guide.getSeoDescription(),
                guide.getActive(),
                guide.getScheduledPublishAt(),
                guide.getRecommendedProducts().stream().map(productMapper::toResponse).toList(),
                guide.getQuickRecommendations().stream().map(this::toQuickRecommendationResponse).toList(),
                guide.getComparisonSpecs().stream().map(this::toComparisonSpecResponse).toList(),
                guide.getRecommendationSections().stream().map(this::toRecommendationSectionResponse).toList(),
                guide.getAdviceSections().stream().map(this::toAdviceSectionResponse).toList(),
                guide.getFaqs().stream().map(this::toFaqResponse).toList(),
                guide.getSectionSettings().stream().map(this::toSectionSettingResponse).toList(),
                guide.getCreatedAt(),
                guide.getUpdatedAt()
        );
    }

    public PublicBuyingGuideSummaryResponse toPublicSummary(BuyingGuide guide) {
        return new PublicBuyingGuideSummaryResponse(
                guide.getId(),
                guide.getTitle(),
                guide.getSlug(),
                guide.getExcerpt(),
                guide.getCoverImageFilename(),
                guide.getCreatedAt()
        );
    }

    public PublicBuyingGuideDetailResponse toPublicDetail(BuyingGuide guide) {
        BuyingGuideRecommendationSection topPickEntity = guide.getRecommendationSections().stream()
                .filter(section -> section.getRecommendationType() == RecommendationType.TOP_PICK)
                .findFirst().orElse(null);
        List<PublicBuyingGuideRecommendationSectionResponse> runnerUps = guide.getRecommendationSections().stream()
                .filter(section -> section.getRecommendationType() == RecommendationType.RUNNER_UP)
                .map(section -> toPublicRecommendationSection(guide, section))
                .toList();

        return new PublicBuyingGuideDetailResponse(
                guide.getId(),
                guide.getTitle(),
                guide.getSlug(),
                guide.getExcerpt(),
                guide.getIntroduction(),
                guide.getCoverImageFilename(),
                guide.getCategory() != null ? guide.getCategory().getProductCategoryName() : null,
                guide.getSeoTitle(),
                guide.getSeoDescription(),
                guide.getCreatedAt(),
                guide.getRecommendedProducts().stream().map(productMapper::toResponse).toList(),
                guide.getQuickRecommendations().stream()
                        .map(rec -> new PublicBuyingGuideQuickRecommendationResponse(
                                productMapper.toResponse(rec.getProduct()), rec.getBadgeName()))
                        .toList(),
                toComparisonTable(guide),
                topPickEntity != null ? toPublicRecommendationSection(guide, topPickEntity) : null,
                runnerUps,
                guide.getAdviceSections().stream()
                        .map(section -> new PublicBuyingGuideAdviceSectionResponse(section.getTitle(), section.getContent()))
                        .toList(),
                guide.getFaqs().stream()
                        .map(faq -> new PublicBuyingGuideFaqResponse(faq.getQuestion(), faq.getAnswer()))
                        .toList(),
                resolveVisibleSectionOrder(guide)
        );
    }

    private BuyingGuideQuickRecommendationResponse toQuickRecommendationResponse(BuyingGuideQuickRecommendation rec) {
        return new BuyingGuideQuickRecommendationResponse(
                rec.getId(), productMapper.toResponse(rec.getProduct()), rec.getBadgeName());
    }

    private BuyingGuideComparisonSpecResponse toComparisonSpecResponse(BuyingGuideComparisonSpec spec) {
        return new BuyingGuideComparisonSpecResponse(
                spec.getId(), spec.getSpecificationName(),
                spec.getValues().stream().map(this::toComparisonValueResponse).toList());
    }

    private BuyingGuideComparisonValueResponse toComparisonValueResponse(BuyingGuideComparisonValue value) {
        return new BuyingGuideComparisonValueResponse(
                value.getId(), productMapper.toResponse(value.getProduct()), value.getSpecificationValue());
    }

    private BuyingGuideRecommendationSectionResponse toRecommendationSectionResponse(
            BuyingGuideRecommendationSection section) {
        return new BuyingGuideRecommendationSectionResponse(
                section.getId(),
                productMapper.toResponse(section.getProduct()),
                section.getRecommendationType(),
                section.getSectionLabel(),
                section.getWhyRecommended(),
                itemResponsesByType(section, RecommendationItemType.PRO),
                itemResponsesByType(section, RecommendationItemType.CON),
                itemResponsesByType(section, RecommendationItemType.BEST_FOR)
        );
    }

    private List<BuyingGuideRecommendationItemResponse> itemResponsesByType(
            BuyingGuideRecommendationSection section, RecommendationItemType type) {
        return section.getItems().stream()
                .filter(item -> item.getItemType() == type)
                .map(item -> new BuyingGuideRecommendationItemResponse(item.getId(), item.getContent()))
                .toList();
    }

    private BuyingGuideAdviceSectionResponse toAdviceSectionResponse(BuyingGuideAdviceSection section) {
        return new BuyingGuideAdviceSectionResponse(section.getId(), section.getTitle(), section.getContent());
    }

    private BuyingGuideFaqResponse toFaqResponse(BuyingGuideFaq faq) {
        return new BuyingGuideFaqResponse(faq.getId(), faq.getQuestion(), faq.getAnswer());
    }

    private BuyingGuideSectionSettingResponse toSectionSettingResponse(BuyingGuideSectionSetting setting) {
        return new BuyingGuideSectionSettingResponse(setting.getSectionKey(), setting.isVisible());
    }

    private PublicBuyingGuideComparisonTableResponse toComparisonTable(BuyingGuide guide) {
        List<BuyingGuideComparisonSpec> specs = guide.getComparisonSpecs();
        if (specs.isEmpty()) {
            return null;
        }
        List<String> specNames = specs.stream().map(BuyingGuideComparisonSpec::getSpecificationName).toList();
        List<PublicBuyingGuideComparisonRowResponse> rows = new ArrayList<>();
        for (Product product : guide.getRecommendedProducts()) {
            List<String> values = specs.stream()
                    .map(spec -> spec.getValues().stream()
                            .filter(value -> value.getProduct().getId().equals(product.getId()))
                            .findFirst()
                            .map(BuyingGuideComparisonValue::getSpecificationValue)
                            .orElse(""))
                    .toList();
            rows.add(new PublicBuyingGuideComparisonRowResponse(productMapper.toResponse(product), values));
        }
        return new PublicBuyingGuideComparisonTableResponse(specNames, rows);
    }

    /**
     * A Top Pick or Runner-Up inherits the Quick Recommendation badge for the same product, if
     * one exists in this guide — no separate badge field is stored on recommendation sections.
     */
    private String badgeNameFor(BuyingGuide guide, Long productId) {
        return guide.getQuickRecommendations().stream()
                .filter(rec -> rec.getProduct().getId().equals(productId))
                .map(BuyingGuideQuickRecommendation::getBadgeName)
                .findFirst()
                .orElse(null);
    }

    private PublicBuyingGuideRecommendationSectionResponse toPublicRecommendationSection(
            BuyingGuide guide, BuyingGuideRecommendationSection section) {
        return new PublicBuyingGuideRecommendationSectionResponse(
                productMapper.toResponse(section.getProduct()),
                section.getRecommendationType(),
                section.getSectionLabel(),
                section.getWhyRecommended(),
                itemContentsByType(section, RecommendationItemType.PRO),
                itemContentsByType(section, RecommendationItemType.CON),
                itemContentsByType(section, RecommendationItemType.BEST_FOR),
                badgeNameFor(guide, section.getProduct().getId())
        );
    }

    private List<String> itemContentsByType(BuyingGuideRecommendationSection section, RecommendationItemType type) {
        return section.getItems().stream()
                .filter(item -> item.getItemType() == type)
                .map(com.twogofindz.backend.entity.BuyingGuideRecommendationItem::getContent)
                .toList();
    }

    /**
     * Any section_key missing a row for this guide defaults to visible with the fallback
     * ordering below. A section only ever renders on the public page if it is both visible
     * here AND has actual saved content (empty comparison table/FAQ list never renders) —
     * that content check happens on the frontend (Stage 3), not here.
     */
    private List<BuyingGuideSectionKey> resolveVisibleSectionOrder(BuyingGuide guide) {
        Map<BuyingGuideSectionKey, BuyingGuideSectionSetting> settingsByKey = guide.getSectionSettings().stream()
                .collect(Collectors.toMap(BuyingGuideSectionSetting::getSectionKey, setting -> setting));

        List<BuyingGuideSectionKey> ordered = new ArrayList<>(guide.getSectionSettings().stream()
                .map(BuyingGuideSectionSetting::getSectionKey)
                .toList());
        for (BuyingGuideSectionKey key : DEFAULT_SECTION_ORDER) {
            if (!settingsByKey.containsKey(key)) {
                ordered.add(key);
            }
        }
        return ordered.stream()
                .filter(key -> !settingsByKey.containsKey(key) || settingsByKey.get(key).isVisible())
                .toList();
    }
}
