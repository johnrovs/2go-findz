package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.ComparisonRequest;
import com.twogofindz.backend.dto.response.ComparisonResponse;
import com.twogofindz.backend.dto.response.ComparisonSummaryResponse;

import java.util.List;

public interface ComparisonService {

    ComparisonResponse create(ComparisonRequest request);

    ComparisonResponse getByIdForAdmin(Long id);

    List<ComparisonSummaryResponse> getAllForAdmin();
}
