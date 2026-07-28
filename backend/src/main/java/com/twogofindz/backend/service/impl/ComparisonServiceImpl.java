package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.ComparisonFaqRequest;
import com.twogofindz.backend.dto.request.ComparisonProductRequest;
import com.twogofindz.backend.dto.request.ComparisonRequest;
import com.twogofindz.backend.dto.request.ComparisonSectionRequest;
import com.twogofindz.backend.dto.request.ComparisonSpecRowRequest;
import com.twogofindz.backend.dto.request.ComparisonSpecValueRequest;
import com.twogofindz.backend.dto.response.ComparisonResponse;
import com.twogofindz.backend.dto.response.ComparisonSummaryResponse;
import com.twogofindz.backend.entity.Comparison;
import com.twogofindz.backend.entity.ComparisonFaq;
import com.twogofindz.backend.entity.ComparisonProduct;
import com.twogofindz.backend.entity.ComparisonSection;
import com.twogofindz.backend.entity.ComparisonSpecRow;
import com.twogofindz.backend.entity.ComparisonSpecValue;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.entity.SpecTier;
import com.twogofindz.backend.exception.DuplicateResourceException;
import com.twogofindz.backend.exception.InvalidComparisonException;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.mapper.ComparisonMapper;
import com.twogofindz.backend.repository.ComparisonRepository;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import com.twogofindz.backend.repository.ProductRepository;
import com.twogofindz.backend.service.ComparisonService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ComparisonServiceImpl implements ComparisonService {

    private final ComparisonRepository comparisonRepository;
    private final ProductRepository productRepository;
    private final ProductCategoryRepository productCategoryRepository;
    private final ComparisonMapper comparisonMapper;

    public ComparisonServiceImpl(ComparisonRepository comparisonRepository,
                                  ProductRepository productRepository,
                                  ProductCategoryRepository productCategoryRepository,
                                  ComparisonMapper comparisonMapper) {
        this.comparisonRepository = comparisonRepository;
        this.productRepository = productRepository;
        this.productCategoryRepository = productCategoryRepository;
        this.comparisonMapper = comparisonMapper;
    }

    @Override
    @Transactional
    public ComparisonResponse create(ComparisonRequest request) {
        validateSpecRowsMatchProducts(request);

        ProductCategory category = findCategory(request.categoryId());
        String slug = resolveSlug(request.slug(), request.title(), null);

        Comparison comparison = Comparison.builder()
                .title(request.title())
                .slug(slug)
                .description(request.description())
                .coverImageFilename(request.coverImageFilename())
                .category(category)
                .seoTitle(request.seoTitle())
                .seoDescription(request.seoDescription())
                .published(request.published())
                .build();

        comparison.setProducts(buildProducts(comparison, request.products()));
        comparison.setSpecRows(buildSpecRows(comparison, request.specRows()));
        comparison.setSections(buildSections(comparison, request.sections()));
        comparison.setFaqs(buildFaqs(comparison, request.faqs()));
        comparison.setRelatedComparisons(resolveRelatedComparisons(request.relatedComparisonIds(), null));
        comparison.setRelatedProducts(resolveRelatedProducts(request.relatedProductIds()));

        return comparisonMapper.toResponse(comparisonRepository.save(comparison));
    }

    @Override
    @Transactional(readOnly = true)
    public ComparisonResponse getByIdForAdmin(Long id) {
        return comparisonMapper.toResponse(findEntityById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComparisonSummaryResponse> getAllForAdmin() {
        return comparisonRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(comparisonMapper::toSummary)
                .toList();
    }

    void validateSpecRowsMatchProducts(ComparisonRequest request) {
        Set<Long> productIds = request.products().stream()
                .map(ComparisonProductRequest::productId)
                .collect(Collectors.toSet());
        for (ComparisonSpecRowRequest row : request.specRows()) {
            Set<Long> valueProductIds = row.values().stream()
                    .map(ComparisonSpecValueRequest::productId)
                    .collect(Collectors.toSet());
            if (row.values().size() != productIds.size() || !valueProductIds.equals(productIds)) {
                throw new InvalidComparisonException(
                        "Spec row \"" + row.rowLabel() + "\" must have exactly one value for every product in the comparison.");
            }
        }
    }

    ProductCategory findCategory(Long categoryId) {
        return productCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
    }

    String resolveSlug(String requestedSlug, String title, Long excludeId) {
        String slug = (requestedSlug == null || requestedSlug.isBlank()) ? slugify(title) : requestedSlug;
        boolean taken = excludeId == null
                ? comparisonRepository.existsBySlug(slug)
                : comparisonRepository.existsBySlugAndIdNot(slug, excludeId);
        if (taken) {
            throw new DuplicateResourceException("A comparison with slug \"" + slug + "\" already exists.");
        }
        return slug;
    }

    private String slugify(String title) {
        String base = title.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return base.isBlank() ? "comparison" : base;
    }

    List<ComparisonProduct> buildProducts(Comparison comparison, List<ComparisonProductRequest> requests) {
        List<ComparisonProduct> products = new ArrayList<>();
        for (ComparisonProductRequest req : requests) {
            Product product = productRepository.findById(req.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + req.productId()));
            products.add(ComparisonProduct.builder()
                    .comparison(comparison)
                    .product(product)
                    .badge(req.badge())
                    .recommendation(req.recommendation())
                    .bestFor(req.bestFor())
                    .mainStrength(req.mainStrength())
                    .mainWeakness(req.mainWeakness())
                    .pros(req.pros())
                    .cons(req.cons())
                    .editorsScore(req.editorsScore())
                    .build());
        }
        return products;
    }

    List<ComparisonSpecRow> buildSpecRows(Comparison comparison, List<ComparisonSpecRowRequest> requests) {
        List<ComparisonSpecRow> rows = new ArrayList<>();
        for (ComparisonSpecRowRequest req : requests) {
            ComparisonSpecRow row = ComparisonSpecRow.builder()
                    .comparison(comparison)
                    .groupLabel(req.groupLabel())
                    .rowLabel(req.rowLabel())
                    .build();
            List<ComparisonSpecValue> values = new ArrayList<>();
            for (ComparisonSpecValueRequest valueReq : req.values()) {
                Product product = productRepository.findById(valueReq.productId())
                        .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + valueReq.productId()));
                values.add(ComparisonSpecValue.builder()
                        .specRow(row)
                        .product(product)
                        .value(valueReq.value())
                        .tier(valueReq.tier() != null ? valueReq.tier() : SpecTier.STANDARD)
                        .build());
            }
            row.setValues(values);
            rows.add(row);
        }
        return rows;
    }

    List<ComparisonSection> buildSections(Comparison comparison, List<ComparisonSectionRequest> requests) {
        List<ComparisonSection> sections = new ArrayList<>();
        for (ComparisonSectionRequest req : requests) {
            sections.add(ComparisonSection.builder()
                    .comparison(comparison)
                    .heading(req.heading())
                    .body(req.body())
                    .build());
        }
        return sections;
    }

    List<ComparisonFaq> buildFaqs(Comparison comparison, List<ComparisonFaqRequest> requests) {
        List<ComparisonFaq> faqs = new ArrayList<>();
        for (ComparisonFaqRequest req : requests) {
            faqs.add(ComparisonFaq.builder()
                    .comparison(comparison)
                    .question(req.question())
                    .answer(req.answer())
                    .build());
        }
        return faqs;
    }

    List<Comparison> resolveRelatedComparisons(List<Long> ids, Long selfId) {
        // Must be mutable: Hibernate clears and repopulates this collection in place when
        // merging an @OrderColumn @ManyToMany association (same reasoning as BuyingGuide's
        // resolveProducts) -- an immutable list throws UnsupportedOperationException on update.
        List<Comparison> ordered = new ArrayList<>();
        if (ids.isEmpty()) {
            return ordered;
        }
        if (selfId != null && ids.contains(selfId)) {
            throw new InvalidComparisonException("A comparison cannot be related to itself.");
        }
        List<Comparison> found = comparisonRepository.findAllById(ids);
        for (Long id : ids) {
            found.stream().filter(c -> c.getId().equals(id)).findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Related comparison not found with id: " + id));
        }
        for (Long id : ids) {
            found.stream().filter(c -> c.getId().equals(id)).findFirst().ifPresent(ordered::add);
        }
        return ordered;
    }

    List<Product> resolveRelatedProducts(List<Long> ids) {
        List<Product> ordered = new ArrayList<>();
        if (ids.isEmpty()) {
            return ordered;
        }
        List<Product> found = productRepository.findAllById(ids);
        for (Long id : ids) {
            found.stream().filter(p -> p.getId().equals(id)).findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Related product not found with id: " + id));
        }
        for (Long id : ids) {
            found.stream().filter(p -> p.getId().equals(id)).findFirst().ifPresent(ordered::add);
        }
        return ordered;
    }

    Comparison findEntityById(Long id) {
        return comparisonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Comparison not found with id: " + id));
    }
}
