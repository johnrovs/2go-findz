package com.twogofindz.backend.controller;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.ChangePasswordRequest;
import com.twogofindz.backend.dto.request.LoginRequest;
import org.junit.jupiter.api.Test;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthControllerTest extends AbstractIntegrationTest {

    @Test
    void login_succeeds_withSeededAdminCredentials() throws Exception {
        LoginRequest request = new LoginRequest("johnrovs", "admin123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.role").value("ADMIN"));
    }

    @Test
    void login_returns401_withWrongPassword() throws Exception {
        LoginRequest request = new LoginRequest("johnrovs", "wrong-password");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void login_returns400_whenUsernameMissing() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content("{\"password\":\"admin123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.username").exists());
    }

    @Test
    void login_succeeds_evenWithMalformedBearerToken() throws Exception {
        // JwtAuthFilter runs on every request (added via addFilterBefore, ahead of the
        // authorization decision), so a garbage bearer token must not crash the filter
        // chain on a permitAll route like /api/auth/login. JwtTokenProvider.validateToken
        // must swallow all jjwt parsing failures (MalformedJwtException, etc.) and return
        // false rather than letting an uncaught exception escape the filter.
        LoginRequest request = new LoginRequest("johnrovs", "admin123");

        mockMvc.perform(post("/api/auth/login")
                        .header("Authorization", "Bearer not-a-valid-jwt")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty());
    }

    @Test
    void changePassword_succeeds_andNewPasswordReplacesOldOne() throws Exception {
        String token = adminToken();
        String newPassword = "newSecurePass1";
        try {
            mockMvc.perform(put("/api/admin/auth/change-password")
                            .header("Authorization", "Bearer " + token)
                            .contentType(APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    new ChangePasswordRequest("admin123", newPassword))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));

            mockMvc.perform(post("/api/auth/login")
                            .contentType(APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(new LoginRequest("johnrovs", newPassword))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.token").isNotEmpty());

            mockMvc.perform(post("/api/auth/login")
                            .contentType(APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(new LoginRequest("johnrovs", "admin123"))))
                    .andExpect(status().isUnauthorized());
        } finally {
            // Restore the seeded admin's password: the Testcontainers MySQL instance and its
            // data are shared across the whole test JVM (see AbstractIntegrationTest), and every
            // other test class logs in via the hardcoded "admin123" through adminToken().
            mockMvc.perform(put("/api/admin/auth/change-password")
                    .header("Authorization", "Bearer " + token)
                    .contentType(APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(
                            new ChangePasswordRequest(newPassword, "admin123"))));
        }
    }

    @Test
    void changePassword_returns401_andLeavesPasswordUnchanged_withWrongCurrentPassword() throws Exception {
        String token = adminToken();

        mockMvc.perform(put("/api/admin/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new ChangePasswordRequest("totally-wrong-password", "irrelevantNewPass1"))))
                .andExpect(status().isUnauthorized());

        // The stored hash must be untouched: the original password still logs in.
        mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("johnrovs", "admin123"))))
                .andExpect(status().isOk());
    }

    @Test
    void changePassword_returns401_withoutAuthToken() throws Exception {
        mockMvc.perform(put("/api/admin/auth/change-password")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new ChangePasswordRequest("admin123", "irrelevantNewPass1"))))
                .andExpect(status().isUnauthorized());
    }
}
