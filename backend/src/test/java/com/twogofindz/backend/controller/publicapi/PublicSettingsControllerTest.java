package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicSettingsControllerTest extends AbstractIntegrationTest {

    @Test
    void get_reachable_withoutAuth() throws Exception {
        mockMvc.perform(get("/api/public/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.affiliateDisclosure").isNotEmpty());
    }
}
