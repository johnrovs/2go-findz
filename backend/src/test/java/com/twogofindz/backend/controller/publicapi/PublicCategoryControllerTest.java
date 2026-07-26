package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicCategoryControllerTest extends AbstractIntegrationTest {

    @Test
    void getAll_neverExposesCommissionRate() throws Exception {
        String token = adminToken();
        createCategoryId(token, "Toys");

        mockMvc.perform(get("/api/public/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].productCategoryName").exists())
                .andExpect(jsonPath("$.data[0].commissionRate").doesNotExist());
    }
}
