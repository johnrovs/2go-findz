package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.response.BuyingGuideResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideDetailResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideSummaryResponse;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.exception.DuplicateResourceException;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.mapper.BuyingGuideMapper;
import com.twogofindz.backend.repository.BuyingGuideRepository;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import com.twogofindz.backend.repository.ProductRepository;
import com.twogofindz.backend.service.BuyingGuideService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class BuyingGuideServiceImpl implements BuyingGuideService {

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
        ProductCategory category = findCategory(request.categoryId());
        String slug = resolveSlug(request.slug(), request.title(), null);

        BuyingGuide guide = BuyingGuide.builder()
                .title(request.title())
                .slug(slug)
                .excerpt(request.excerpt())
                .introduction(request.introduction())
                .coverImageFilename(request.coverImageFilename())
                .category(category)
                .seoTitle(request.seoTitle())
                .seoDescription(request.seoDescription())
                .active(request.active())
                .scheduledPublishAt(request.scheduledPublishAt())
                .recommendedProducts(resolveProducts(request.recommendedProductIds()))
                .build();
        return buyingGuideMapper.toResponse(buyingGuideRepository.save(guide));
    }

    @Override
    @Transactional
    public BuyingGuideResponse update(Long id, BuyingGuideRequest request) {
        BuyingGuide guide = findEntityById(id);
        ProductCategory category = findCategory(request.categoryId());
        String slug = resolveSlug(request.slug(), request.title(), id);

        guide.setTitle(request.title());
        guide.setSlug(slug);
        guide.setExcerpt(request.excerpt());
        guide.setIntroduction(request.introduction());
        guide.setCoverImageFilename(request.coverImageFilename());
        guide.setCategory(category);
        guide.setSeoTitle(request.seoTitle());
        guide.setSeoDescription(request.seoDescription());
        guide.setActive(request.active());
        guide.setScheduledPublishAt(request.scheduledPublishAt());
        guide.setRecommendedProducts(resolveProducts(request.recommendedProductIds()));
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
