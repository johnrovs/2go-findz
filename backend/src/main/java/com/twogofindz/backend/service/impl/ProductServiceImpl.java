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

    private Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
    }

    private ProductCategory findCategory(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
    }
}
