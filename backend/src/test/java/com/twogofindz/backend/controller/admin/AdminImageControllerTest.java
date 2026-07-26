package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminImageControllerTest extends AbstractIntegrationTest {

    @Test
    void upload_succeeds_withValidJpegImage() throws Exception {
        String token = adminToken();
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", new byte[]{1, 2, 3, 4});

        mockMvc.perform(multipart("/api/admin/images")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.filename")
                        .value(matchesPattern("img_\\d{8}_\\d{6}_\\d{3}\\.jpg")));
    }

    @Test
    void upload_returns400_forEmptyFile() throws Exception {
        String token = adminToken();
        MockMultipartFile file = new MockMultipartFile("file", "empty.jpg", "image/jpeg", new byte[0]);

        mockMvc.perform(multipart("/api/admin/images")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void upload_returns400_forDisallowedContentType() throws Exception {
        String token = adminToken();
        MockMultipartFile file = new MockMultipartFile("file", "doc.pdf", "application/pdf", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/admin/images")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void upload_returns401_withoutToken() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/admin/images").file(file))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void uploadedImage_isServedViaStaticResourceHandler() throws Exception {
        String token = adminToken();
        String filename = uploadTestImage(token);

        mockMvc.perform(get("/uploads/{filename}", filename))
                .andExpect(status().isOk());
    }
}
