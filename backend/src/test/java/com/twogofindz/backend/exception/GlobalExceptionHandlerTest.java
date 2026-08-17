package com.twogofindz.backend.exception;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.CategoryRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies that standard Spring MVC exceptions (wrong HTTP method, malformed JSON, unmapped
 * paths, path variable type mismatches) are translated into this project's {@code ApiResponse}
 * envelope with the correct HTTP status, rather than falling through to an unlogged 500 or
 * Spring's default HTML error page.
 */
class GlobalExceptionHandlerTest extends AbstractIntegrationTest {

    @Test
    void wrongHttpMethod_returns405_withJsonEnvelope() throws Exception {
        // /api/auth/login is only mapped for POST.
        mockMvc.perform(get("/api/auth/login"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void malformedJsonBody_returns400_withJsonEnvelope() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content("{ this is not valid json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void unknownPath_returns404_withJsonEnvelope() throws Exception {
        // Use a permitAll prefix so Spring Security lets the request through to the
        // DispatcherServlet (an unmapped path under a protected prefix would 401 first).
        mockMvc.perform(get("/api/public/this-path-does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void pathVariableTypeMismatch_returns400_notInternalServerError() throws Exception {
        String token = adminToken();
        mockMvc.perform(get("/api/admin/products/{id}", "abc")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void invalidSortBy_returns400_notInternalServerError() throws Exception {
        String token = adminToken();
        mockMvc.perform(get("/api/admin/categories")
                        .param("sortBy", "nonexistentField")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void createCategory_returns400_whenNameExceedsColumnLength() throws Exception {
        String token = adminToken();
        String overlongName = "A".repeat(101);
        CategoryRequest request = new CategoryRequest(overlongName, new BigDecimal("5.00"), null, true);

        mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.productCategoryName").exists());
    }
}
