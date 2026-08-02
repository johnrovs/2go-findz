package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.BuyingGuideComparisonSpecRequest;
import com.twogofindz.backend.dto.request.BuyingGuideComparisonValueRequest;
import com.twogofindz.backend.dto.request.BuyingGuideFaqRequest;
import com.twogofindz.backend.dto.request.BuyingGuideQuickRecommendationRequest;
import com.twogofindz.backend.dto.request.BuyingGuideRecommendationItemRequest;
import com.twogofindz.backend.dto.request.BuyingGuideRecommendationSectionRequest;
import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.request.BuyingGuideTocEntryRequest;
import com.twogofindz.backend.dto.response.BuyingGuideResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideDetailResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideSummaryResponse;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.BuyingGuideComparisonSpec;
import com.twogofindz.backend.entity.BuyingGuideComparisonValue;
import com.twogofindz.backend.entity.BuyingGuideFaq;
import com.twogofindz.backend.entity.BuyingGuideQuickRecommendation;
import com.twogofindz.backend.entity.BuyingGuideRecommendationItem;
import com.twogofindz.backend.entity.BuyingGuideRecommendationSection;
import com.twogofindz.backend.entity.BuyingGuideSectionKey;
import com.twogofindz.backend.entity.BuyingGuideTocEntry;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.entity.RecommendationItemType;
import com.twogofindz.backend.entity.RecommendationType;
import com.twogofindz.backend.exception.DuplicateResourceException;
import com.twogofindz.backend.exception.InvalidBuyingGuideException;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.mapper.BuyingGuideMapper;
import com.twogofindz.backend.repository.BuyingGuideRepository;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import com.twogofindz.backend.repository.ProductRepository;
import com.twogofindz.backend.service.BuyingGuideService;
import com.twogofindz.backend.util.HtmlSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BuyingGuideServiceImpl implements BuyingGuideService {

    private static final List<BuyingGuideSectionKey> DEFAULT_STRUCTURAL_ORDER = List.of(
            BuyingGuideSectionKey.QUICK_RECOMMENDATIONS, BuyingGuideSectionKey.COMPARISON_TABLE,
            BuyingGuideSectionKey.TOP_PICK, BuyingGuideSectionKey.RUNNER_UPS, BuyingGuideSectionKey.FAQS);

    private final BuyingGuideRepository buyingGuideRepository;
    private final ProductRepository productRepository;
    private final ProductCategoryRepository productCategoryRepository;
    private final BuyingGuideMapper buyingGuideMapper;

    public BuyingGuideServiceImpl(BuyingGuideRepository buyingGuideRepository,
                                   ProductRepository productRepository,
                                   ProductCategoryRepository productCategoryRepository,
                                   BuyingGuideMapper buyingGuideMapper) {
        this.buyingGuideRepository = buyingGuideRepository;
        this.productRepository = productRepository;
        this.productCategoryRepository = productCategoryRepository;
        this.buyingGuideMapper = buyingGuideMapper;
    }

    @Override
    @Transactional
    public BuyingGuideResponse create(BuyingGuideRequest request) {
        validateRequest(request);
        ProductCategory category = findCategory(request.categoryId());
        String slug = resolveSlug(request.slug(), request.title(), null);

        BuyingGuide guide = BuyingGuide.builder()
                .title(request.title())
                .slug(slug)
                .excerpt(request.excerpt())
                .introduction(HtmlSanitizer.sanitize(request.introduction()))
                .coverImageFilename(request.coverImageFilename())
                .category(category)
                .seoTitle(request.seoTitle())
                .seoDescription(request.seoDescription())
                .active(request.active())
                .scheduledPublishAt(request.scheduledPublishAt())
                .recommendedProducts(resolveProducts(request.recommendedProductIds()))
                .build();

        guide.setQuickRecommendations(buildQuickRecommendations(guide, request.quickRecommendations()));
        guide.setComparisonSpecs(buildComparisonSpecs(guide, request.comparisonSpecs()));
        guide.setRecommendationSections(buildRecommendationSections(guide, request.recommendationSections()));
        guide.setFaqs(buildFaqs(guide, request.faqs()));
        guide.setTocEntries(buildTocEntries(guide, request.tocEntries()));

        return buyingGuideMapper.toResponse(buyingGuideRepository.save(guide));
    }

    @Override
    @Transactional
    public BuyingGuideResponse update(Long id, BuyingGuideRequest request) {
        validateRequest(request);
        BuyingGuide guide = findEntityById(id);
        ProductCategory category = findCategory(request.categoryId());
        String slug = resolveSlug(request.slug(), request.title(), id);

        guide.setTitle(request.title());
        guide.setSlug(slug);
        guide.setExcerpt(request.excerpt());
        guide.setIntroduction(HtmlSanitizer.sanitize(request.introduction()));
        guide.setCoverImageFilename(request.coverImageFilename());
        guide.setCategory(category);
        guide.setSeoTitle(request.seoTitle());
        guide.setSeoDescription(request.seoDescription());
        guide.setActive(request.active());
        guide.setScheduledPublishAt(request.scheduledPublishAt());
        guide.setRecommendedProducts(resolveProducts(request.recommendedProductIds()));

        // These six are owned @OneToMany(cascade=ALL, orphanRemoval=true) children: Hibernate
        // rejects reassigning their collection reference on an already-managed entity, so the
        // replacement must mutate the existing collection in place (same reasoning documented on
        // Comparison's update()).
        //
        // All six clear()s are flushed together, before any addAll(): a save that resends the
        // same values it already loaded (e.g. an edit that only touches Basic Info fields and
        // otherwise round-trips quickRecommendations/comparisonSpecs/recommendationSections/faqs
        // unchanged) re-inserts rows whose unique keys match the ones just orphaned. Hibernate's
        // default action-queue ordering for an @OrderColumn collection does not guarantee the
        // DELETEs are physically committed before the INSERTs run within one flush, so without
        // this the re-insert collides with the not-yet-deleted old row. tocEntries hits this on
        // effectively every save (its 5 structural section_key rows are backfilled every time);
        // the other five only reproduce once a save resends identical child data, which no admin
        // UI could do until the Basic Info editor's preserve-on-save behavior existed.
        guide.getQuickRecommendations().clear();
        guide.getComparisonSpecs().clear();
        guide.getRecommendationSections().clear();
        guide.getFaqs().clear();
        guide.getTocEntries().clear();
        buyingGuideRepository.flush();
        guide.getQuickRecommendations().addAll(buildQuickRecommendations(guide, request.quickRecommendations()));
        guide.getComparisonSpecs().addAll(buildComparisonSpecs(guide, request.comparisonSpecs()));
        guide.getRecommendationSections().addAll(buildRecommendationSections(guide, request.recommendationSections()));
        guide.getFaqs().addAll(buildFaqs(guide, request.faqs()));
        guide.getTocEntries().addAll(buildTocEntries(guide, request.tocEntries()));

        return buyingGuideMapper.toResponse(buyingGuideRepository.save(guide));
    }

    @Override
    @Transactional(readOnly = true)
    public BuyingGuideResponse getByIdForAdmin(Long id) {
        return buyingGuideMapper.toResponse(findEntityById(id));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        buyingGuideRepository.delete(findEntityById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<BuyingGuideResponse> getAllForAdmin() {
        return buyingGuideRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(buyingGuideMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PublicBuyingGuideSummaryResponse> getAllForPublic() {
        return buyingGuideRepository.findByActiveTrueOrderByCreatedAtDesc().stream()
                .map(buyingGuideMapper::toPublicSummary)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PublicBuyingGuideDetailResponse getBySlugForPublic(String slug) {
        BuyingGuide guide = buyingGuideRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Buying guide not found with slug: " + slug));
        // Deliberately identical to the "not found" outcome above: a draft guide must not
        // be distinguishable from a nonexistent one via the public API (no information leak).
        if (!guide.getActive()) {
            throw new ResourceNotFoundException("Buying guide not found with slug: " + slug);
        }
        return buyingGuideMapper.toPublicDetail(guide);
    }

    /**
     * Every cross-entity rule from the design doc in one place: no duplicate products, every
     * child-section product reference must belong to the guide's own product list, every
     * comparison spec must cover the guide's product set exactly, at most one Top Pick
     * (backstopped at the DB level by the generated-column unique index on
     * buying_guide_recommendation_sections), no duplicate structural TOC section keys
     * (backstopped at the DB level by the unique index on buying_guide_toc_entries), every
     * structural TOC entry must not carry a custom title/content, and every custom TOC entry
     * must have both. Missing structural keys are NOT rejected here — {@link #buildTocEntries}
     * backfills them.
     */
    private void validateRequest(BuyingGuideRequest request) {
        Set<Long> productIds = new LinkedHashSet<>(request.recommendedProductIds());
        if (productIds.size() != request.recommendedProductIds().size()) {
            throw new InvalidBuyingGuideException("A product cannot be added to this guide more than once.");
        }

        for (BuyingGuideQuickRecommendationRequest quickRec : request.quickRecommendations()) {
            if (!productIds.contains(quickRec.productId())) {
                throw new InvalidBuyingGuideException(
                        "Quick recommendation references a product that is not included in this guide.");
            }
        }

        Set<String> badgeNames = new LinkedHashSet<>();
        for (BuyingGuideQuickRecommendationRequest quickRec : request.quickRecommendations()) {
            if (!badgeNames.add(quickRec.badgeName().trim().toLowerCase())) {
                throw new InvalidBuyingGuideException(
                        "Two quick picks cannot use the same badge name: \"" + quickRec.badgeName() + "\".");
            }
        }

        for (BuyingGuideComparisonSpecRequest spec : request.comparisonSpecs()) {
            Set<Long> valueProductIds = spec.values().stream()
                    .map(BuyingGuideComparisonValueRequest::productId)
                    .collect(Collectors.toSet());
            if (valueProductIds.size() != spec.values().size() || !valueProductIds.equals(productIds)) {
                throw new InvalidBuyingGuideException(
                        "Comparison specification \"" + spec.specificationName()
                                + "\" must have exactly one value for every product in this guide.");
            }
        }

        int topPickCount = 0;
        for (BuyingGuideRecommendationSectionRequest section : request.recommendationSections()) {
            if (!productIds.contains(section.productId())) {
                throw new InvalidBuyingGuideException(
                        "Recommendation section \"" + section.sectionLabel()
                                + "\" references a product that is not included in this guide.");
            }
            if (section.recommendationType() == RecommendationType.TOP_PICK) {
                topPickCount++;
            }
        }
        if (topPickCount > 1) {
            throw new InvalidBuyingGuideException("A buying guide can have at most one Top Pick.");
        }

        validateTocEntries(request.tocEntries());
    }

    private void validateTocEntries(List<BuyingGuideTocEntryRequest> tocEntries) {
        Set<BuyingGuideSectionKey> seenKeys = new HashSet<>();
        for (BuyingGuideTocEntryRequest entry : tocEntries) {
            if (entry.sectionKey() != null) {
                if (!seenKeys.add(entry.sectionKey())) {
                    throw new InvalidBuyingGuideException(
                            "Section \"" + entry.sectionKey()
                                    + "\" cannot appear more than once in the table of contents.");
                }
                if (entry.title() != null || entry.content() != null) {
                    throw new InvalidBuyingGuideException(
                            "Built-in section \"" + entry.sectionKey()
                                    + "\" cannot have a custom title or content.");
                }
            } else {
                if (entry.title() == null || entry.title().isBlank()) {
                    throw new InvalidBuyingGuideException("Every custom table of contents entry requires a title.");
                }
                if (entry.content() == null || entry.content().isBlank()) {
                    throw new InvalidBuyingGuideException("Every custom table of contents entry requires content.");
                }
            }
        }
    }

    private List<BuyingGuideQuickRecommendation> buildQuickRecommendations(
            BuyingGuide guide, List<BuyingGuideQuickRecommendationRequest> requests) {
        List<BuyingGuideQuickRecommendation> result = new ArrayList<>();
        for (BuyingGuideQuickRecommendationRequest req : requests) {
            result.add(BuyingGuideQuickRecommendation.builder()
                    .buyingGuide(guide).product(findProduct(req.productId())).badgeName(req.badgeName()).build());
        }
        return result;
    }

    private List<BuyingGuideComparisonSpec> buildComparisonSpecs(
            BuyingGuide guide, List<BuyingGuideComparisonSpecRequest> requests) {
        List<BuyingGuideComparisonSpec> result = new ArrayList<>();
        for (BuyingGuideComparisonSpecRequest req : requests) {
            BuyingGuideComparisonSpec spec = BuyingGuideComparisonSpec.builder()
                    .buyingGuide(guide).specificationName(req.specificationName()).build();
            List<BuyingGuideComparisonValue> values = new ArrayList<>();
            for (BuyingGuideComparisonValueRequest valueReq : req.values()) {
                values.add(BuyingGuideComparisonValue.builder()
                        .comparisonSpec(spec).product(findProduct(valueReq.productId()))
                        .specificationValue(valueReq.value()).build());
            }
            spec.setValues(values);
            result.add(spec);
        }
        return result;
    }

    /**
     * Pros, Cons, and Best For all live in one physical table ({@code items}), discriminated by
     * {@code itemType}, ordered by a single shared {@code @OrderColumn}. Concatenating the three
     * request lists in this fixed order (pros, then cons, then best-for) means each group's
     * relative order survives being filtered back out by type later in the mapper — no separate
     * JPA collection per item type is needed.
     */
    private List<BuyingGuideRecommendationSection> buildRecommendationSections(
            BuyingGuide guide, List<BuyingGuideRecommendationSectionRequest> requests) {
        List<BuyingGuideRecommendationSection> result = new ArrayList<>();
        for (BuyingGuideRecommendationSectionRequest req : requests) {
            BuyingGuideRecommendationSection section = BuyingGuideRecommendationSection.builder()
                    .buyingGuide(guide).product(findProduct(req.productId()))
                    .recommendationType(req.recommendationType())
                    .sectionLabel(req.sectionLabel())
                    .whyRecommended(HtmlSanitizer.sanitize(req.whyRecommended()))
                    .build();

            List<BuyingGuideRecommendationItem> items = new ArrayList<>();
            addItems(section, items, req.pros(), RecommendationItemType.PRO);
            addItems(section, items, req.cons(), RecommendationItemType.CON);
            addItems(section, items, req.bestFor(), RecommendationItemType.BEST_FOR);
            section.setItems(items);

            result.add(section);
        }
        return result;
    }

    private void addItems(BuyingGuideRecommendationSection section, List<BuyingGuideRecommendationItem> items,
                           List<BuyingGuideRecommendationItemRequest> requests, RecommendationItemType type) {
        for (BuyingGuideRecommendationItemRequest req : requests) {
            items.add(BuyingGuideRecommendationItem.builder()
                    .recommendationSection(section).itemType(type).content(req.content()).build());
        }
    }

    private List<BuyingGuideFaq> buildFaqs(BuyingGuide guide, List<BuyingGuideFaqRequest> requests) {
        List<BuyingGuideFaq> result = new ArrayList<>();
        for (BuyingGuideFaqRequest req : requests) {
            result.add(BuyingGuideFaq.builder()
                    .buyingGuide(guide).question(req.question())
                    .answer(HtmlSanitizer.sanitize(req.answer())).build());
        }
        return result;
    }

    /**
     * Builds the guide's TOC entries in the request's given order, then appends any of the 5
     * structural keys the request omitted, each defaulted to {@code visible = true}, in
     * {@link #DEFAULT_STRUCTURAL_ORDER}. This backfill (not rejection) preserves the ergonomics
     * the old {@code resolveVisibleSectionOrder} read-time fallback provided — a caller doesn't
     * have to configure every structural section just to save a guide.
     */
    private List<BuyingGuideTocEntry> buildTocEntries(BuyingGuide guide, List<BuyingGuideTocEntryRequest> requests) {
        List<BuyingGuideTocEntry> result = new ArrayList<>();
        Set<BuyingGuideSectionKey> seenKeys = new HashSet<>();
        for (BuyingGuideTocEntryRequest req : requests) {
            if (req.sectionKey() != null) {
                seenKeys.add(req.sectionKey());
            }
            result.add(BuyingGuideTocEntry.builder()
                    .buyingGuide(guide)
                    .sectionKey(req.sectionKey())
                    .title(req.title())
                    .content(req.sectionKey() == null ? HtmlSanitizer.sanitize(req.content()) : null)
                    .visible(req.visible())
                    .build());
        }
        for (BuyingGuideSectionKey key : DEFAULT_STRUCTURAL_ORDER) {
            if (!seenKeys.contains(key)) {
                result.add(BuyingGuideTocEntry.builder()
                        .buyingGuide(guide).sectionKey(key).visible(true).build());
            }
        }
        return result;
    }

    private String resolveSlug(String requestedSlug, String title, Long excludeId) {
        String slug = (requestedSlug == null || requestedSlug.isBlank()) ? slugify(title) : requestedSlug;
        boolean taken = excludeId == null
                ? buyingGuideRepository.existsBySlug(slug)
                : buyingGuideRepository.existsBySlugAndIdNot(slug, excludeId);
        if (taken) {
            throw new DuplicateResourceException("A buying guide with slug \"" + slug + "\" already exists.");
        }
        return slug;
    }

    private String slugify(String title) {
        String base = title.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return base.isBlank() ? "buying-guide" : base;
    }

    private ProductCategory findCategory(Long categoryId) {
        return productCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
    }

    private Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
    }

    private List<Product> resolveProducts(List<Long> ids) {
        // Must be a mutable list: Hibernate clears and repopulates this collection in place
        // when merging an @OrderColumn @ManyToMany association, and an immutable list (as
        // List.of()/Stream.toList() would produce) throws UnsupportedOperationException there.
        List<Product> ordered = new ArrayList<>();
        if (ids.isEmpty()) {
            return ordered;
        }
        List<Product> found = productRepository.findAllById(ids);
        for (Long id : ids) {
            found.stream().filter(product -> product.getId().equals(id)).findFirst().ifPresent(ordered::add);
        }
        return ordered;
    }

    private BuyingGuide findEntityById(Long id) {
        return buyingGuideRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Buying guide not found with id: " + id));
    }
}
