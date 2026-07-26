package com.twogofindz.backend.dto.response;

public record LoginResponse(
        String token,
        String username,
        String fullName,
        String role
) {
}
