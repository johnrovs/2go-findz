package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.response.DashboardAnalyticsResponse;
import com.twogofindz.backend.dto.response.DashboardSummaryResponse;

import java.time.LocalDate;

public interface DashboardService {
    DashboardSummaryResponse getSummary(LocalDate from, LocalDate to);
    DashboardAnalyticsResponse getAnalytics(LocalDate from, LocalDate to);
}
