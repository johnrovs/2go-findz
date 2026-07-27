package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.response.BuyingGuideResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideDetailResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideSummaryResponse;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.mapper.BuyingGuideMapper;
import com.twogofindz.backend.repository.BuyingGuideRepository;
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
    private final BuyingGuideMapper buyingGuideMapper;

    public BuyingGuideServiceImpl(BuyingGuideRepository buyingGuideRepository,
                                   ProductRepository productRepository,
                                   BuyingGuideMapper buyingGuideMapper) {
        this.buyingGuideRepository = buyingGuideRepository;
        this.productRepository = productRepository;
        this.buyingGuideMapper = buyingGuideMapper;
    }

    @Override
    @Transactional
    public BuyingGuideResponse create(BuyingGuideRequest request) {
        BuyingGuide guide = BuyingGuide.builder()
                .title(request.title())
                .excerpt(request.excerpt())
                .content(request.content())
                .coverImageFilename(request.coverImageFilename())
                .active(request.active())
                .recommendedProducts(resolveProducts(request.recommendedProductIds()))
                .build();
        return buyingGuideMapper.toResponse(buyingGuideRepository.save(guide));
    }

    @Override
    @Transactional
    public BuyingGuideResponse update(Long id, BuyingGuideRequest request) {
        BuyingGuide guide = findEntityById(id);
        guide.setTitle(request.title());
        guide.setExcerpt(request.excerpt());
        guide.setContent(request.content());
        guide.setCoverImageFilename(request.coverImageFilename());
        guide.setActive(request.active());
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
    public PublicBuyingGuideDetailResponse getByIdForPublic(Long id) {
        BuyingGuide guide = findEntityById(id);
        // Deliberately identical to the "not found" outcome below: a draft guide must not
        // be distinguishable from a nonexistent one via the public API (no information leak).
        if (!guide.getActive()) {
            throw new ResourceNotFoundException("Buying guide not found with id: " + id);
        }
        return buyingGuideMapper.toPublicDetail(guide);
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
        // Preserve the caller's requested order rather than whatever order the DB returns,
        // since this order becomes the guide's recommended-products display order.
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
