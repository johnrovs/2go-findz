package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.CategoryRequest;
import com.twogofindz.backend.dto.response.CategoryResponse;
import com.twogofindz.backend.dto.response.PublicCategoryResponse;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.exception.DuplicateResourceException;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.mapper.CategoryMapper;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import com.twogofindz.backend.service.CategoryService;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoryServiceImpl implements CategoryService {

    private final ProductCategoryRepository categoryRepository;
    private final CategoryMapper categoryMapper;

    public CategoryServiceImpl(ProductCategoryRepository categoryRepository, CategoryMapper categoryMapper) {
        this.categoryRepository = categoryRepository;
        this.categoryMapper = categoryMapper;
    }

    @Override
    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        if (categoryRepository.existsByProductCategoryNameIgnoreCase(request.productCategoryName())) {
            throw new DuplicateResourceException(
                    "A category named '" + request.productCategoryName() + "' already exists.");
        }
        ProductCategory category = ProductCategory.builder()
                .productCategoryName(request.productCategoryName())
                .commissionRate(request.commissionRate())
                .build();
        return categoryMapper.toResponse(categoryRepository.save(category));
    }

    @Override
    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        ProductCategory category = findEntityById(id);

        categoryRepository.findByProductCategoryNameIgnoreCase(request.productCategoryName())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException(
                            "A category named '" + request.productCategoryName() + "' already exists.");
                });

        category.setProductCategoryName(request.productCategoryName());
        category.setCommissionRate(request.commissionRate());
        return categoryMapper.toResponse(categoryRepository.save(category));
    }

    @Override
    public CategoryResponse getById(Long id) {
        return categoryMapper.toResponse(findEntityById(id));
    }

    @Override
    public List<CategoryResponse> getAll(String sortBy, String direction) {
        return categoryRepository.findAll(buildSort(sortBy, direction)).stream()
                .map(categoryMapper::toResponse)
                .toList();
    }

    @Override
    public List<PublicCategoryResponse> getAllForPublic() {
        return categoryRepository.findAll(Sort.by(Sort.Direction.ASC, "productCategoryName")).stream()
                .map(categoryMapper::toPublicResponse)
                .toList();
    }

    private Sort buildSort(String sortBy, String direction) {
        Sort.Direction sortDirection = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        String property = (sortBy == null || sortBy.isBlank()) ? "productCategoryName" : sortBy;
        return Sort.by(sortDirection, property);
    }

    ProductCategory findEntityById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
    }
}
