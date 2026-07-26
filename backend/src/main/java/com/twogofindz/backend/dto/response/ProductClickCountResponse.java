package com.twogofindz.backend.dto.response;

public record ProductClickCountResponse(Long productId, String productName, long clickCount) {
}
