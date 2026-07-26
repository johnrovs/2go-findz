package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicViewControllerTest extends AbstractIntegrationTest {

    @Test
    void recordView_succeeds_andReturnsNonBlankSessionId() throws Exception {
        mockMvc.perform(post("/api/public/views"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sessionId").isNotEmpty());
    }

    @Test
    void recordView_returnsDifferentSessionIds_acrossCalls() throws Exception {
        var first = mockMvc.perform(post("/api/public/views")).andReturn();
        var second = mockMvc.perform(post("/api/public/views")).andReturn();

        String firstId = objectMapper.readTree(first.getResponse().getContentAsString())
                .path("data").path("sessionId").asText();
        String secondId = objectMapper.readTree(second.getResponse().getContentAsString())
                .path("data").path("sessionId").asText();

        org.assertj.core.api.Assertions.assertThat(firstId).isNotEqualTo(secondId);
    }
}
