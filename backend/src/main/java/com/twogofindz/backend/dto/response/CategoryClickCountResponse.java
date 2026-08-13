package com.twogofindz.backend.dto.response;

public record CategoryClickCountResponse(Long categoryId, String categoryName, long clickCount) {
}
