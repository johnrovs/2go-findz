package com.twogofindz.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.twogofindz.backend.dto.request.CategoryRequest;
import com.twogofindz.backend.dto.request.LoginRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.MySQLContainer;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
public abstract class AbstractIntegrationTest {

    // Singleton container pattern: started once in a static initializer (not via @Testcontainers/@Container)
    // and never explicitly stopped, so it survives across every test class in this JVM. Testcontainers' Ryuk
    // reaper cleans it up on JVM exit. This matters because @Testcontainers manages @Container fields with
    // per-class start/stop semantics; since this field is shared (declared once on this abstract base and
    // inherited by every subclass), letting the extension stop it after one test class's methods finish would
    // kill the container for every later test class while Spring's cached ApplicationContext/DataSource pool
    // keeps pointing at the now-dead container, breaking each subsequent class with connection failures.
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("two_go_findz_test")
            .withUsername("test")
            .withPassword("test");

    static {
        MYSQL.start();
    }

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("app.jwt.secret", () -> "test-secret-key-for-jwt-signing-in-tests-only-1234567890");
        registry.add("app.jwt.expiration-ms", () -> "86400000");
        registry.add("app.cors.allowed-origin", () -> "http://localhost:5173");
        registry.add("app.upload.directory", () -> "uploads-test");
    }

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    /** Logs in as the seeded admin and returns a bearer token for use in Authorization headers. */
    protected String adminToken() throws Exception {
        var result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("johnrovs", "admin123"))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("token").asText();
    }

    /** Creates a category with a 5.00% commission rate via the admin API and returns its id. */
    protected Long createCategoryId(String token, String name) throws Exception {
        var result = mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CategoryRequest(name, new BigDecimal("5.00"), null, true))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }

    /** Uploads a small valid JPEG via the admin image upload endpoint and returns the stored filename. */
    protected String uploadTestImage(String token) throws Exception {
        org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", new byte[]{1, 2, 3, 4});
        var result = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .multipart("/api/admin/images")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("filename").asText();
    }
}
