package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.ComparisonRequest;
import com.twogofindz.backend.dto.response.ComparisonResponse;
import com.twogofindz.backend.dto.response.ComparisonSummaryResponse;

import java.util.List;

public interface ComparisonService {

    ComparisonResponse create(ComparisonRequest request);

    ComparisonResponse update(Long id, ComparisonRequest request);

    void delete(Long id);

    ComparisonResponse getByIdForAdmin(Long id);

    List<ComparisonSummaryResponse> getAllForAdmin();
}
