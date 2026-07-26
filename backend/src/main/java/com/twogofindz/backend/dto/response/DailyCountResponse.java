package com.twogofindz.backend.dto.response;

import java.time.LocalDate;

public record DailyCountResponse(LocalDate date, long count) {
}
