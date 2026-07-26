package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.CategoryRequest;
import com.twogofindz.backend.dto.response.CategoryResponse;
import com.twogofindz.backend.dto.response.PublicCategoryResponse;

import java.util.List;

public interface CategoryService {
    CategoryResponse create(CategoryRequest request);
    CategoryResponse update(Long id, CategoryRequest request);
    CategoryResponse getById(Long id);
    List<CategoryResponse> getAll(String sortBy, String direction);
    List<PublicCategoryResponse> getAllForPublic();
}
