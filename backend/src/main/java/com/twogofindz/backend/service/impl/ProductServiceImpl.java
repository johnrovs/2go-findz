package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.ProductRequest;
import com.twogofindz.backend.dto.response.ProductResponse;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.mapper.ProductMapper;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import com.twogofindz.backend.repository.ProductRepository;
import com.twogofindz.backend.repository.spec.ProductSpecifications;
import com.twogofindz.backend.service.ProductService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final ProductCategoryRepository categoryRepository;
    private final ProductMapper productMapper;

    public ProductServiceImpl(ProductRepository productRepository,
                               ProductCategoryRepository categoryRepository,
                               ProductMapper productMapper) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.productMapper = productMapper;
    }

    @Override
    @Transactional
    public ProductResponse create(ProductRequest request) {
        ProductCategory category = findCategory(request.categoryId());
        Product product = Product.builder()
                .name(request.name())
                .description(request.description())
                .category(category)
                .imageFileName(request.imageFileName())
                .productPrice(request.productPrice())
                .productLink(request.productLink())
                .trending(request.trending())
                .bestSeller(request.bestSeller())
                .active(request.active())
                .build();
        return productMapper.toResponse(productRepository.save(product));
    }

    @Override
    @Transactional
    public ProductResponse update(Long id, ProductRequest request) {
        Product product = findProduct(id);
        ProductCategory category = findCategory(request.categoryId());

        product.setName(request.name());
        product.setDescription(request.description());
        product.setCategory(category);
        product.setImageFileName(request.imageFileName());
        product.setProductPrice(request.productPrice());
        product.setProductLink(request.productLink());
        product.setTrending(request.trending());
        product.setBestSeller(request.bestSeller());
        product.setActive(request.active());

        return productMapper.toResponse(productRepository.save(product));
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getById(Long id) {
        return productMapper.toResponse(findProduct(id));
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getActiveById(Long id) {
        Product product = findProduct(id);
        // Deliberately identical to the "not found" outcome below: a soft-deleted product must
        // not be distinguishable from a nonexistent one via the public API (no information leak).
        if (!product.isActive()) {
            throw new ResourceNotFoundException("Product not found with id: " + id);
        }
        return productMapper.toResponse(product);
    }

    @Override
    @Transactional
    public void softDelete(Long id) {
        Product product = findProduct(id);
        product.setActive(false);
        productRepository.save(product);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> search(String term, Long categoryId, Boolean trending, Boolean bestSeller,
                                         Boolean active, BigDecimal minPrice, BigDecimal maxPrice, Pageable pageable) {
        Specification<Product> spec = Specification
                .where(ProductSpecifications.search(term))
                .and(ProductSpecifications.hasCategoryId(categoryId))
                .and(ProductSpecifications.isTrending(trending))
                .and(ProductSpecifications.isBestSeller(bestSeller))
                .and(ProductSpecifications.isActive(active))
                .and(ProductSpecifications.priceBetween(minPrice, maxPrice));

        return productRepository.findAll(spec, pageable).map(productMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> getComparableByIds(List<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        List<Product> found = productRepository.findAllByIdInAndActiveTrue(ids);
        // Preserve the caller's requested order rather than whatever order the DB returns,
        // since the frontend uses this order as the comparison table's column order.
        return ids.stream()
                .flatMap(id -> found.stream().filter(product -> product.getId().equals(id)))
                .map(productMapper::toResponse)
                .toList();
    }

    private Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
    }

    private ProductCategory findCategory(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
    }
}
