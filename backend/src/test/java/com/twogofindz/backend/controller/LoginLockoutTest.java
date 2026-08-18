package com.twogofindz.backend.controller;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.LoginRequest;
import org.junit.jupiter.api.Test;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies HTTP-level lockout behavior. Uses a decoy username unique to this test (rather than
 * the seeded "johnrovs" admin shared across the whole test JVM via {@link AbstractIntegrationTest})
 * so this test cannot lock out the account other test classes rely on for {@code adminToken()}.
 */
class LoginLockoutTest extends AbstractIntegrationTest {

    private static final String DECOY_USERNAME = "lockout-decoy-user";

    @Test
    void login_returns429_afterRepeatedFailures_forNonexistentUsername() throws Exception {
        LoginRequest wrongCreds = new LoginRequest(DECOY_USERNAME, "wrong-password");

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(wrongCreds)))
                    .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wrongCreds)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(
                        "Too many failed login attempts. Please try again in a few minutes."));
    }
}
