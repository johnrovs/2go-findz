package com.twogofindz.backend.controller;

import com.twogofindz.backend.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthorizationTest extends AbstractIntegrationTest {

    @Test
    void adminEndpoint_rejectsRequestWithoutToken() throws Exception {
        mockMvc.perform(get("/api/admin/products"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminEndpoint_rejectsInvalidToken() throws Exception {
        mockMvc.perform(get("/api/admin/products")
                        .header("Authorization", "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void publicEndpoint_reachableWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/public/products"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/public/categories"))
                .andExpect(status().isOk());
    }

    @Test
    void newAdminEndpoints_rejectRequestWithoutToken() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/admin/images"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/admin/settings"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/admin/dashboard/summary"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void newPublicEndpoints_reachableWithoutAuth() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/public/views"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/public/settings"))
                .andExpect(status().isOk());
    }
}
