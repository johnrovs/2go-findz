# Backend Analytics/Media (Stage 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add image upload (swappable `StorageService`), anonymous view/click tracking, dashboard analytics with estimated commission calculation, and system settings to the backend — without changing any Stage 1 endpoint, DTO, or entity contract.

**Architecture:** Same layered structure as Stage 1 (`controller → service → service.impl → repository → entity`, Flyway migrations, `ApiResponse` envelope). Image upload is decoupled from record CRUD via one generic upload endpoint. Full rationale in `docs/superpowers/specs/2026-07-26-backend-analytics-media-design.md`.

**Tech Stack:** Same as Stage 1 (Java 21, Spring Boot 3.2.5, MySQL 8, Flyway, JUnit 5 + Mockito + MockMvc + Testcontainers).

## Global Constraints

- Everything from Stage 1's Global Constraints still applies (Flyway-only schema, `BigDecimal` for money, `LocalDateTime` for timestamps with `insertable=false, updatable=false` DB-managed columns, `ApiResponse<T>`/`ValidationErrorResponse` envelope, Testcontainers MySQL not H2, package base `com.twogofindz.backend` with `controller.publicapi` for public controllers).
- **No breaking changes to Stage 1.** `ProductRequest`, `CategoryRequest`, `ProductResponse`, `CategoryResponse`, `PublicCategoryResponse`, and every existing endpoint's URL/behavior stay exactly as shipped. New functionality is additive (new endpoints, new optional fields, new files) or a narrowly-scoped modification to an existing file (e.g. adding a constructor dependency, adding a query method) — never a signature change to something already public.
- Image upload is a **separate endpoint** (`POST /api/admin/images`) that returns a filename; it is never merged into product/category/settings create/update payloads.
- Uploaded files: JPEG/PNG/WebP only, ≤5MB, original client filename never trusted — filenames are always server-generated (`img_yyyyMMdd_HHmmss_NNN.ext`).
- Anonymous session ids are server-issued UUIDs (`POST /api/public/views` generates and returns one); tracking endpoints are `permitAll`.
- Dashboard/analytics endpoints accept only explicit `from`/`to` `LocalDate` query params — no named-period parsing on the backend.
- Estimated commission = `price × (categoryCommissionRate / 100) × trackedClicks` — always presented as an estimate, never as confirmed income.
- `system_settings` is a single-row table (id fixed at `1`), seeded with defaults so `GET` never 404s.
- Tests run against Testcontainers MySQL (`mysql:8.0`) via the existing `AbstractIntegrationTest`, using its inherited `adminToken()`/`createCategoryId()` helpers — never redeclare them.
- Never commit `.env`.

---

### Task 1: Image upload — `StorageService`, generic upload endpoint, static serving

**Files:**
- Create: `backend/src/main/java/com/twogofindz/backend/service/StorageService.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/impl/LocalStorageService.java`
- Create: `backend/src/main/java/com/twogofindz/backend/exception/InvalidFileException.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/UploadResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/controller/admin/AdminImageController.java`
- Create: `backend/src/main/java/com/twogofindz/backend/config/WebMvcConfig.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/config/SecurityConfig.java` (add `/uploads/**` to permit-all matchers)
- Modify: `backend/src/main/java/com/twogofindz/backend/exception/GlobalExceptionHandler.java` (add `InvalidFileException` and `MaxUploadSizeExceededException` handlers — this class already `extends ResponseEntityExceptionHandler` as of Stage 1's final review fix; add these as ordinary `@ExceptionHandler` methods alongside the existing ones)
- Modify: `backend/src/main/resources/application.yml` (add multipart size limits)
- Modify: `backend/src/test/java/com/twogofindz/backend/AbstractIntegrationTest.java` (add a shared `uploadTestImage(String token): String` helper)
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminImageControllerTest.java`

**Interfaces:**
- Consumes: `ApiResponse`, `GlobalExceptionHandler` (Stage 1); `app.upload.directory` config property (Stage 1)
- Produces: `StorageService.store(MultipartFile): String` / `.delete(String filename): void`; `POST /api/admin/images` → `{ filename }`; `/uploads/**` static serving; `AbstractIntegrationTest.uploadTestImage(String token): String filename` — Task 4 may use this for its placeholder-fallback test if it chooses to exercise the real upload path.

- [ ] **Step 1: Write the failing tests**

```java
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn test -Dtest=AdminImageControllerTest`
Expected: FAIL — compilation error (`StorageService`, `AdminImageController`, `uploadTestImage` don't exist yet).

- [ ] **Step 3: Write `InvalidFileException` and `StorageService`**

```java
package com.twogofindz.backend.exception;

public class InvalidFileException extends RuntimeException {
    public InvalidFileException(String message) {
        super(message);
    }
}
```

```java
package com.twogofindz.backend.service;

import org.springframework.web.multipart.MultipartFile;

public interface StorageService {
    String store(MultipartFile file);
    void delete(String filename);
}
```

- [ ] **Step 4: Write `LocalStorageService`**

```java
package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.exception.InvalidFileException;
import com.twogofindz.backend.service.StorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class LocalStorageService implements StorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");
    private static final AtomicLong SEQUENCE = new AtomicLong(0);

    private final Path uploadDirectory;

    public LocalStorageService(@Value("${app.upload.directory}") String uploadDirectory) {
        this.uploadDirectory = Path.of(uploadDirectory);
        try {
            Files.createDirectories(this.uploadDirectory);
        } catch (IOException e) {
            throw new UncheckedIOException("Unable to initialize upload directory: " + uploadDirectory, e);
        }
    }

    @Override
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("Uploaded file must not be empty.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new InvalidFileException("Uploaded file exceeds the 5MB size limit.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new InvalidFileException("Only JPG, PNG, and WebP images are allowed.");
        }

        String extension = extensionFor(contentType);
        String filename = "img_" + LocalDateTime.now().format(TIMESTAMP_FORMAT)
                + "_" + String.format("%03d", SEQUENCE.incrementAndGet() % 1000) + "." + extension;

        try {
            Path target = uploadDirectory.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store uploaded file.", e);
        }

        return filename;
    }

    @Override
    public void delete(String filename) {
        if (filename == null || filename.isBlank()) {
            return;
        }
        try {
            Files.deleteIfExists(uploadDirectory.resolve(filename));
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to delete stored file: " + filename, e);
        }
    }

    private String extensionFor(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> throw new InvalidFileException("Unsupported content type: " + contentType);
        };
    }
}
```

- [ ] **Step 5: Write `UploadResponse` and `AdminImageController`**

```java
package com.twogofindz.backend.dto.response;

public record UploadResponse(String filename) {
}
```

```java
package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.UploadResponse;
import com.twogofindz.backend.service.StorageService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/images")
public class AdminImageController {

    private final StorageService storageService;

    public AdminImageController(StorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping
    public ApiResponse<UploadResponse> upload(@RequestParam("file") MultipartFile file) {
        String filename = storageService.store(file);
        return ApiResponse.success("Image uploaded successfully.", new UploadResponse(filename));
    }
}
```

- [ ] **Step 6: Write `WebMvcConfig` for static serving**

```java
package com.twogofindz.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final String uploadDirectory;

    public WebMvcConfig(@Value("${app.upload.directory}") String uploadDirectory) {
        this.uploadDirectory = uploadDirectory;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadDirectory + "/");
    }
}
```

- [ ] **Step 7: Modify `SecurityConfig`**

Add `"/uploads/**"` to the existing permit-all matcher call, so it reads:
```java
.requestMatchers("/api/auth/**", "/api/public/**", "/uploads/**").permitAll()
```

- [ ] **Step 8: Modify `GlobalExceptionHandler`**

Add these two handlers (the class already extends `ResponseEntityExceptionHandler` as of Stage 1's final review fix — add these as additional `@ExceptionHandler` methods, same style as the existing `handleDuplicate`/`handleCategoryInUse`):

```java
@ExceptionHandler(InvalidFileException.class)
public ResponseEntity<ApiResponse<Void>> handleInvalidFile(InvalidFileException ex) {
    return ResponseEntity.badRequest().body(ApiResponse.failure(ex.getMessage()));
}

@ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
public ResponseEntity<ApiResponse<Void>> handleMaxUploadSizeExceeded(
        org.springframework.web.multipart.MaxUploadSizeExceededException ex) {
    return ResponseEntity.badRequest().body(ApiResponse.failure("Uploaded file exceeds the maximum allowed size."));
}
```
(Add the import for `InvalidFileException` at the top of the file alongside the other exception imports.)

- [ ] **Step 9: Modify `application.yml`**

Add under the existing `spring:` key:
```yaml
  servlet:
    multipart:
      max-file-size: 5MB
      max-request-size: 5MB
```

- [ ] **Step 10: Modify `AbstractIntegrationTest` to add the shared upload helper**

Add this method (needs `org.springframework.mock.web.MockMultipartFile` and `org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart` imports):

```java
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
```

- [ ] **Step 11: Run test to verify it passes**

Run: `cd backend && mvn test -Dtest=AdminImageControllerTest`
Expected: PASS

- [ ] **Step 12: Run the full suite to confirm no regressions**

Run: `cd backend && mvn test`
Expected: PASS (all Stage 1 tests + this task's)

- [ ] **Step 13: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/service/StorageService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/LocalStorageService.java \
        backend/src/main/java/com/twogofindz/backend/exception/InvalidFileException.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/UploadResponse.java \
        backend/src/main/java/com/twogofindz/backend/controller/admin/AdminImageController.java \
        backend/src/main/java/com/twogofindz/backend/config/WebMvcConfig.java \
        backend/src/main/java/com/twogofindz/backend/config/SecurityConfig.java \
        backend/src/main/java/com/twogofindz/backend/exception/GlobalExceptionHandler.java \
        backend/src/main/resources/application.yml \
        backend/src/test/java/com/twogofindz/backend/AbstractIntegrationTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminImageControllerTest.java
git commit -m "feat: add StorageService abstraction and generic image upload endpoint"
```

---

### Task 2: Website view tracking

**Files:**
- Create: `backend/src/main/resources/db/migration/V5__create_website_views_table.sql`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/WebsiteView.java`
- Create: `backend/src/main/java/com/twogofindz/backend/repository/WebsiteViewRepository.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/ViewTrackingResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/ViewTrackingService.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/impl/ViewTrackingServiceImpl.java`
- Create: `backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicViewController.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicViewControllerTest.java`

**Interfaces:**
- Consumes: `ApiResponse` (Stage 1)
- Produces: `WebsiteView` entity (`id, anonymousSessionId, viewedAt`); `WebsiteViewRepository extends JpaRepository<WebsiteView, Long>` (no custom methods yet — Task 5 adds count/grouping methods when it needs them); `POST /api/public/views` → `{ sessionId }`.

- [ ] **Step 1: Write the failing test**

```java
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn test -Dtest=PublicViewControllerTest`
Expected: FAIL — compilation error (classes don't exist yet).

- [ ] **Step 3: Write the migration**

```sql
CREATE TABLE website_views (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    anonymous_session_id VARCHAR(64) NULL,
    viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_website_views_viewed_at ON website_views (viewed_at);
```

- [ ] **Step 4: Write the entity and repository**

```java
package com.twogofindz.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "website_views")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebsiteView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "anonymous_session_id", length = 64)
    private String anonymousSessionId;

    @Column(name = "viewed_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime viewedAt;
}
```

```java
package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.WebsiteView;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WebsiteViewRepository extends JpaRepository<WebsiteView, Long> {
}
```

- [ ] **Step 5: Write the DTO, service, and controller**

```java
package com.twogofindz.backend.dto.response;

public record ViewTrackingResponse(String sessionId) {
}
```

```java
package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.response.ViewTrackingResponse;

public interface ViewTrackingService {
    ViewTrackingResponse recordView();
}
```

```java
package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.response.ViewTrackingResponse;
import com.twogofindz.backend.entity.WebsiteView;
import com.twogofindz.backend.repository.WebsiteViewRepository;
import com.twogofindz.backend.service.ViewTrackingService;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class ViewTrackingServiceImpl implements ViewTrackingService {

    private final WebsiteViewRepository websiteViewRepository;

    public ViewTrackingServiceImpl(WebsiteViewRepository websiteViewRepository) {
        this.websiteViewRepository = websiteViewRepository;
    }

    @Override
    public ViewTrackingResponse recordView() {
        String sessionId = UUID.randomUUID().toString();
        WebsiteView view = WebsiteView.builder()
                .anonymousSessionId(sessionId)
                .build();
        websiteViewRepository.save(view);
        return new ViewTrackingResponse(sessionId);
    }
}
```

```java
package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.ViewTrackingResponse;
import com.twogofindz.backend.service.ViewTrackingService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/views")
public class PublicViewController {

    private final ViewTrackingService viewTrackingService;

    public PublicViewController(ViewTrackingService viewTrackingService) {
        this.viewTrackingService = viewTrackingService;
    }

    @PostMapping
    public ApiResponse<ViewTrackingResponse> recordView() {
        return ApiResponse.success("View recorded.", viewTrackingService.recordView());
    }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && mvn test -Dtest=PublicViewControllerTest`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/resources/db/migration/V5__create_website_views_table.sql \
        backend/src/main/java/com/twogofindz/backend/entity/WebsiteView.java \
        backend/src/main/java/com/twogofindz/backend/repository/WebsiteViewRepository.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/ViewTrackingResponse.java \
        backend/src/main/java/com/twogofindz/backend/service/ViewTrackingService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/ViewTrackingServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicViewController.java \
        backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicViewControllerTest.java
git commit -m "feat: add anonymous website-view tracking"
```

---

### Task 3: Product click tracking

**Files:**
- Create: `backend/src/main/resources/db/migration/V6__create_product_clicks_table.sql`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/ProductClick.java`
- Create: `backend/src/main/java/com/twogofindz/backend/repository/ProductClickRepository.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/ClickRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/ClickTrackingService.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/impl/ClickTrackingServiceImpl.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicProductController.java` (add the click-tracking endpoint; inject `ClickTrackingService`)
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicProductControllerTest.java` (add click-tracking test cases)

**Interfaces:**
- Consumes: `ApiResponse`, `ResourceNotFoundException` (Stage 1); `Product`, `ProductRepository` (Stage 1)
- Produces: `ProductClick` entity (`id, product: Product, anonymousSessionId, clickedAt`); `ProductClickRepository extends JpaRepository<ProductClick, Long>` (no custom methods yet — Task 5 adds them); `POST /api/public/products/{id}/click`.

- [ ] **Step 1: Write the failing tests**

Add these test methods to the existing `PublicProductControllerTest.java` (do not remove the existing `search_neverReturnsInactiveProducts`/`getById_returns404_forUnknownProduct` tests):

```java
    @Test
    void recordClick_succeeds_forExistingProduct() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Click Tracking Category");
        var createResult = mockMvc.perform(
                        org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/admin/products")
                                .header("Authorization", "Bearer " + token)
                                .contentType(APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(new ProductRequest(
                                        "Clickable Product", "Tracks clicks.", categoryId, null,
                                        new java.math.BigDecimal("30.00"), "https://amazon.com/dp/clickable",
                                        false, false, true))))
                .andReturn();
        Long productId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(post("/api/public/products/{id}/click", productId)
                        .contentType(APPLICATION_JSON)
                        .content("{\"sessionId\":\"test-session-123\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void recordClick_succeeds_withoutSessionIdInBody() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "No Session Click Category");
        var createResult = mockMvc.perform(
                        org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/admin/products")
                                .header("Authorization", "Bearer " + token)
                                .contentType(APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(new ProductRequest(
                                        "No Session Product", "No session id sent.", categoryId, null,
                                        new java.math.BigDecimal("15.00"), "https://amazon.com/dp/nosession",
                                        false, false, true))))
                .andReturn();
        Long productId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(post("/api/public/products/{id}/click", productId))
                .andExpect(status().isOk());
    }

    @Test
    void recordClick_returns404_forUnknownProduct() throws Exception {
        mockMvc.perform(post("/api/public/products/{id}/click", 999999L))
                .andExpect(status().isNotFound());
    }
```

(These use the file's existing imports — `post`, `status`, `APPLICATION_JSON`, `ProductRequest`, `adminToken()`, `createCategoryId()` are all already present from Stage 1's Task 5.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && mvn test -Dtest=PublicProductControllerTest`
Expected: FAIL — compilation error (`ClickRequest`, click endpoint don't exist yet).

- [ ] **Step 3: Write the migration**

```sql
CREATE TABLE product_clicks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    anonymous_session_id VARCHAR(64) NULL,
    clicked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_clicks_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_product_clicks_product ON product_clicks (product_id);
CREATE INDEX idx_product_clicks_clicked_at ON product_clicks (clicked_at);
```

`ON DELETE CASCADE` here (unlike `products→product_categories`'s `RESTRICT`) because products are soft-deleted in normal operation — this FK only matters if a row is ever hard-deleted administratively, and orphaned click history for a nonexistent product is meaningless.

- [ ] **Step 4: Write the entity and repository**

```java
package com.twogofindz.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "product_clicks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductClick {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "anonymous_session_id", length = 64)
    private String anonymousSessionId;

    @Column(name = "clicked_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime clickedAt;
}
```

```java
package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.ProductClick;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductClickRepository extends JpaRepository<ProductClick, Long> {
}
```

- [ ] **Step 5: Write the DTO and service**

```java
package com.twogofindz.backend.dto.request;

public record ClickRequest(String sessionId) {
}
```

```java
package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.ClickRequest;

public interface ClickTrackingService {
    void recordClick(Long productId, ClickRequest request);
}
```

```java
package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.ClickRequest;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductClick;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.repository.ProductClickRepository;
import com.twogofindz.backend.repository.ProductRepository;
import com.twogofindz.backend.service.ClickTrackingService;
import org.springframework.stereotype.Service;

@Service
public class ClickTrackingServiceImpl implements ClickTrackingService {

    private final ProductClickRepository productClickRepository;
    private final ProductRepository productRepository;

    public ClickTrackingServiceImpl(ProductClickRepository productClickRepository,
                                     ProductRepository productRepository) {
        this.productClickRepository = productClickRepository;
        this.productRepository = productRepository;
    }

    @Override
    public void recordClick(Long productId, ClickRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        ProductClick click = ProductClick.builder()
                .product(product)
                .anonymousSessionId(request == null ? null : request.sessionId())
                .build();
        productClickRepository.save(click);
    }
}
```

- [ ] **Step 6: Modify `PublicProductController`**

Add the `ClickTrackingService` dependency to the constructor and add this endpoint:

```java
@PostMapping("/{id}/click")
public ApiResponse<Void> recordClick(
        @PathVariable Long id,
        @RequestBody(required = false) ClickRequest request) {
    clickTrackingService.recordClick(id, request);
    return ApiResponse.success("Click recorded.");
}
```

Add the corresponding imports (`ClickRequest`, `ClickTrackingService`, `PostMapping`, `RequestBody`) to the top of the file.

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && mvn test -Dtest=PublicProductControllerTest`
Expected: PASS

- [ ] **Step 8: Run the full suite to confirm no regressions**

Run: `cd backend && mvn test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/resources/db/migration/V6__create_product_clicks_table.sql \
        backend/src/main/java/com/twogofindz/backend/entity/ProductClick.java \
        backend/src/main/java/com/twogofindz/backend/repository/ProductClickRepository.java \
        backend/src/main/java/com/twogofindz/backend/dto/request/ClickRequest.java \
        backend/src/main/java/com/twogofindz/backend/service/ClickTrackingService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/ClickTrackingServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicProductController.java \
        backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicProductControllerTest.java
git commit -m "feat: add product click tracking"
```

---

### Task 4: System settings + product placeholder-image fallback

**Files:**
- Create: `backend/src/main/resources/db/migration/V7__create_system_settings_table.sql`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/SystemSettings.java`
- Create: `backend/src/main/java/com/twogofindz/backend/repository/SystemSettingsRepository.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/SettingsRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/SettingsResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/mapper/SettingsMapper.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/SettingsService.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/impl/SettingsServiceImpl.java`
- Create: `backend/src/main/java/com/twogofindz/backend/controller/admin/AdminSettingsController.java`
- Create: `backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicSettingsController.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/mapper/ProductMapper.java` (inject `SettingsService`, fall back to the configured placeholder when a product has no image)
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminSettingsControllerTest.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicSettingsControllerTest.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/ProductPlaceholderImageTest.java`

**Interfaces:**
- Consumes: `ApiResponse`, `ResourceNotFoundException` (Stage 1)
- Produces: `SystemSettings` entity (single row, id fixed at `1`); `SettingsService.getSettings(): SettingsResponse`, `.updateSettings(SettingsRequest): SettingsResponse`, `.getPlaceholderImageFilename(): String`; `GET/PUT /api/admin/settings`, `GET /api/public/settings`. `ProductMapper.toResponse` now depends on `SettingsService`.

- [ ] **Step 1: Write the failing tests**

`AdminSettingsControllerTest.java`:
```java
package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.SettingsRequest;
import org.junit.jupiter.api.Test;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminSettingsControllerTest extends AbstractIntegrationTest {

    @Test
    void get_returnsSeededDefaults_beforeAnyUpdate() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/admin/settings").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.heroHeadline").isNotEmpty());
    }

    @Test
    void update_succeeds_andPersistsAllFields() throws Exception {
        String token = adminToken();
        SettingsRequest request = new SettingsRequest(
                "logo.png", "hero.jpg", "placeholder.png",
                "https://tiktok.com/@2gofindz", "https://pinterest.com/2gofindz",
                "https://instagram.com/2gofindz", "https://youtube.com/@2gofindz",
                "Updated shop bio.", "Updated Headline", "Updated description.",
                "Updated disclosure.", "contact@2gofindz.com");

        mockMvc.perform(put("/api/admin/settings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.heroHeadline").value("Updated Headline"))
                .andExpect(jsonPath("$.data.contactEmail").value("contact@2gofindz.com"));

        mockMvc.perform(get("/api/admin/settings").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data.shopBio").value("Updated shop bio."));
    }

    @Test
    void update_returns400_forInvalidEmail() throws Exception {
        String token = adminToken();
        SettingsRequest request = new SettingsRequest(
                null, null, null, null, null, null, null, null, null, null, null, "not-an-email");

        mockMvc.perform(put("/api/admin/settings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void get_returns401_withoutToken() throws Exception {
        mockMvc.perform(get("/api/admin/settings"))
                .andExpect(status().isUnauthorized());
    }
}
```

`PublicSettingsControllerTest.java`:
```java
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
```

`ProductPlaceholderImageTest.java`:
```java
package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.ProductRequest;
import com.twogofindz.backend.dto.request.SettingsRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProductPlaceholderImageTest extends AbstractIntegrationTest {

    @Test
    void productWithoutImage_fallsBackToConfiguredPlaceholder() throws Exception {
        String token = adminToken();

        SettingsRequest settingsRequest = new SettingsRequest(
                null, null, "configured-placeholder.png", null, null, null, null,
                null, null, null, null, null);
        mockMvc.perform(put("/api/admin/settings")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(settingsRequest)));

        Long categoryId = createCategoryId(token, "Placeholder Fallback Category");
        ProductRequest productRequest = new ProductRequest(
                "No Image Product", "Has no image set.", categoryId, null,
                new BigDecimal("12.00"), "https://amazon.com/dp/noimage", false, false, true);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imageFileName").value("configured-placeholder.png"));
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && mvn test -Dtest=AdminSettingsControllerTest,PublicSettingsControllerTest,ProductPlaceholderImageTest`
Expected: FAIL — compilation error (classes don't exist yet).

- [ ] **Step 3: Write the migration**

```sql
CREATE TABLE system_settings (
    id BIGINT PRIMARY KEY,
    logo_image_filename VARCHAR(255) NULL,
    hero_image_filename VARCHAR(255) NULL,
    placeholder_image_filename VARCHAR(255) NULL,
    tiktok_url VARCHAR(500) NULL,
    pinterest_url VARCHAR(500) NULL,
    instagram_url VARCHAR(500) NULL,
    youtube_url VARCHAR(500) NULL,
    shop_bio TEXT NULL,
    hero_headline VARCHAR(255) NULL,
    hero_description TEXT NULL,
    affiliate_disclosure TEXT NULL,
    contact_email VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO system_settings (
    id, shop_bio, hero_headline, hero_description, affiliate_disclosure
) VALUES (
    1,
    'Discover trending Amazon products, everyday essentials, affordable finds, and must-have items carefully selected to help you shop smarter.',
    'Smart Finds. Better Buys. All in One Place.',
    'Discover trending Amazon products, everyday essentials, affordable finds, and must-have items carefully selected to help you shop smarter.',
    'As an Amazon Associate, 2Go Findz may earn from qualifying purchases. Product prices and availability may change at any time.'
);
```

- [ ] **Step 4: Write the entity and repository**

```java
package com.twogofindz.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "system_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemSettings {

    @Id
    private Long id;

    @Column(name = "logo_image_filename")
    private String logoImageFilename;

    @Column(name = "hero_image_filename")
    private String heroImageFilename;

    @Column(name = "placeholder_image_filename")
    private String placeholderImageFilename;

    @Column(name = "tiktok_url", length = 500)
    private String tiktokUrl;

    @Column(name = "pinterest_url", length = 500)
    private String pinterestUrl;

    @Column(name = "instagram_url", length = 500)
    private String instagramUrl;

    @Column(name = "youtube_url", length = 500)
    private String youtubeUrl;

    @Column(name = "shop_bio", columnDefinition = "TEXT")
    private String shopBio;

    @Column(name = "hero_headline")
    private String heroHeadline;

    @Column(name = "hero_description", columnDefinition = "TEXT")
    private String heroDescription;

    @Column(name = "affiliate_disclosure", columnDefinition = "TEXT")
    private String affiliateDisclosure;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
```

```java
package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.SystemSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemSettingsRepository extends JpaRepository<SystemSettings, Long> {
}
```

- [ ] **Step 5: Write the DTOs and mapper**

```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.Email;

public record SettingsRequest(
        String logoImageFilename,
        String heroImageFilename,
        String placeholderImageFilename,
        String tiktokUrl,
        String pinterestUrl,
        String instagramUrl,
        String youtubeUrl,
        String shopBio,
        String heroHeadline,
        String heroDescription,
        String affiliateDisclosure,
        @Email(message = "Contact email must be a valid email address.") String contactEmail
) {
}
```

```java
package com.twogofindz.backend.dto.response;

public record SettingsResponse(
        String logoImageFilename,
        String heroImageFilename,
        String placeholderImageFilename,
        String tiktokUrl,
        String pinterestUrl,
        String instagramUrl,
        String youtubeUrl,
        String shopBio,
        String heroHeadline,
        String heroDescription,
        String affiliateDisclosure,
        String contactEmail
) {
}
```

```java
package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.SettingsResponse;
import com.twogofindz.backend.entity.SystemSettings;
import org.springframework.stereotype.Component;

@Component
public class SettingsMapper {

    public SettingsResponse toResponse(SystemSettings settings) {
        return new SettingsResponse(
                settings.getLogoImageFilename(),
                settings.getHeroImageFilename(),
                settings.getPlaceholderImageFilename(),
                settings.getTiktokUrl(),
                settings.getPinterestUrl(),
                settings.getInstagramUrl(),
                settings.getYoutubeUrl(),
                settings.getShopBio(),
                settings.getHeroHeadline(),
                settings.getHeroDescription(),
                settings.getAffiliateDisclosure(),
                settings.getContactEmail()
        );
    }
}
```

- [ ] **Step 6: Write `SettingsService` and its implementation**

```java
package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.SettingsRequest;
import com.twogofindz.backend.dto.response.SettingsResponse;

public interface SettingsService {
    SettingsResponse getSettings();
    SettingsResponse updateSettings(SettingsRequest request);
    String getPlaceholderImageFilename();
}
```

```java
package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.SettingsRequest;
import com.twogofindz.backend.dto.response.SettingsResponse;
import com.twogofindz.backend.entity.SystemSettings;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.mapper.SettingsMapper;
import com.twogofindz.backend.repository.SystemSettingsRepository;
import com.twogofindz.backend.service.SettingsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingsServiceImpl implements SettingsService {

    private static final Long SETTINGS_ID = 1L;

    private final SystemSettingsRepository settingsRepository;
    private final SettingsMapper settingsMapper;

    public SettingsServiceImpl(SystemSettingsRepository settingsRepository, SettingsMapper settingsMapper) {
        this.settingsRepository = settingsRepository;
        this.settingsMapper = settingsMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public SettingsResponse getSettings() {
        return settingsMapper.toResponse(findSettings());
    }

    @Override
    @Transactional
    public SettingsResponse updateSettings(SettingsRequest request) {
        SystemSettings settings = findSettings();
        settings.setLogoImageFilename(request.logoImageFilename());
        settings.setHeroImageFilename(request.heroImageFilename());
        settings.setPlaceholderImageFilename(request.placeholderImageFilename());
        settings.setTiktokUrl(request.tiktokUrl());
        settings.setPinterestUrl(request.pinterestUrl());
        settings.setInstagramUrl(request.instagramUrl());
        settings.setYoutubeUrl(request.youtubeUrl());
        settings.setShopBio(request.shopBio());
        settings.setHeroHeadline(request.heroHeadline());
        settings.setHeroDescription(request.heroDescription());
        settings.setAffiliateDisclosure(request.affiliateDisclosure());
        settings.setContactEmail(request.contactEmail());
        return settingsMapper.toResponse(settingsRepository.save(settings));
    }

    @Override
    @Transactional(readOnly = true)
    public String getPlaceholderImageFilename() {
        return findSettings().getPlaceholderImageFilename();
    }

    private SystemSettings findSettings() {
        return settingsRepository.findById(SETTINGS_ID)
                .orElseThrow(() -> new ResourceNotFoundException("System settings have not been initialized."));
    }
}
```

- [ ] **Step 7: Write the controllers**

```java
package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.dto.request.SettingsRequest;
import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.SettingsResponse;
import com.twogofindz.backend.service.SettingsService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/settings")
public class AdminSettingsController {

    private final SettingsService settingsService;

    public AdminSettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public ApiResponse<SettingsResponse> get() {
        return ApiResponse.success("Settings retrieved successfully.", settingsService.getSettings());
    }

    @PutMapping
    public ApiResponse<SettingsResponse> update(@Valid @RequestBody SettingsRequest request) {
        return ApiResponse.success("Settings updated successfully.", settingsService.updateSettings(request));
    }
}
```

```java
package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.SettingsResponse;
import com.twogofindz.backend.service.SettingsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/settings")
public class PublicSettingsController {

    private final SettingsService settingsService;

    public PublicSettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public ApiResponse<SettingsResponse> get() {
        return ApiResponse.success("Settings retrieved successfully.", settingsService.getSettings());
    }
}
```

- [ ] **Step 8: Modify `ProductMapper` to add the placeholder fallback**

Add a `SettingsService` constructor dependency and use it when `imageFileName` is null:

```java
package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.ProductResponse;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.service.SettingsService;
import org.springframework.stereotype.Component;

@Component
public class ProductMapper {

    private final SettingsService settingsService;

    public ProductMapper(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    public ProductResponse toResponse(Product product) {
        String imageFileName = product.getImageFileName() != null
                ? product.getImageFileName()
                : settingsService.getPlaceholderImageFilename();

        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getCategory().getId(),
                product.getCategory().getProductCategoryName(),
                imageFileName,
                product.getProductPrice(),
                product.getProductLink(),
                product.isTrending(),
                product.isBestSeller(),
                product.isActive(),
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }
}
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `cd backend && mvn test -Dtest=AdminSettingsControllerTest,PublicSettingsControllerTest,ProductPlaceholderImageTest`
Expected: PASS

- [ ] **Step 10: Run the full suite to confirm no regressions**

Run: `cd backend && mvn test`
Expected: PASS — `ProductMapper`'s new constructor dependency must not break any existing product test.

- [ ] **Step 11: Commit**

```bash
git add backend/src/main/resources/db/migration/V7__create_system_settings_table.sql \
        backend/src/main/java/com/twogofindz/backend/entity/SystemSettings.java \
        backend/src/main/java/com/twogofindz/backend/repository/SystemSettingsRepository.java \
        backend/src/main/java/com/twogofindz/backend/dto/request/SettingsRequest.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/SettingsResponse.java \
        backend/src/main/java/com/twogofindz/backend/mapper/SettingsMapper.java \
        backend/src/main/java/com/twogofindz/backend/service/SettingsService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/SettingsServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/controller/admin/AdminSettingsController.java \
        backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicSettingsController.java \
        backend/src/main/java/com/twogofindz/backend/mapper/ProductMapper.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminSettingsControllerTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicSettingsControllerTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/ProductPlaceholderImageTest.java
git commit -m "feat: add system settings and product placeholder-image fallback"
```

---

### Task 5: Dashboard analytics + estimated commission calculation

**This task is contract-first, not code-first.** Stage 1's final whole-branch review noted that specifying implementation code verbatim in the plan — rather than contracts, invariants, and required test cases — was how three defects entered the codebase (the plan's own code samples had bugs later teams copied). Analytics aggregation queries are exactly the kind of thing better left to the implementer's judgment, verified by precise tests. The DTOs, service interface, and controller below are fixed contracts; the repository query methods and their SQL/JPQL are **not** — implement them however produces correct results against the tests.

**Files:**
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/DashboardSummaryResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/DailyCountResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/MonthlyCountResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/ProductClickCountResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/CategoryCommissionResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/DashboardAnalyticsResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/DashboardService.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/impl/DashboardServiceImpl.java` (implementer designs the internals)
- Create: `backend/src/main/java/com/twogofindz/backend/controller/admin/AdminDashboardController.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/repository/ProductRepository.java` (add count methods — see Business Rules below)
- Modify: `backend/src/main/java/com/twogofindz/backend/repository/WebsiteViewRepository.java` (add whatever query methods `DashboardServiceImpl` needs)
- Modify: `backend/src/main/java/com/twogofindz/backend/repository/ProductClickRepository.java` (add whatever query methods `DashboardServiceImpl` needs)
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminDashboardControllerTest.java`

**Interfaces:**
- Consumes: `Product`, `ProductCategory`, `ProductRepository`, `ProductCategoryRepository` (Stage 1); `WebsiteView`, `WebsiteViewRepository` (Task 2); `ProductClick`, `ProductClickRepository` (Task 3)
- Produces: `GET /api/admin/dashboard/summary?from=&to=`, `GET /api/admin/dashboard/analytics?from=&to=` — this is the final task other than cross-cutting cleanup, nothing downstream consumes these DTOs within this stage.

**DTO contracts (fixed — write these exactly):**

```java
package com.twogofindz.backend.dto.response;

import java.math.BigDecimal;

public record DashboardSummaryResponse(
        long totalViews,
        long totalClicks,
        BigDecimal estimatedTotalCommission,
        long totalProducts,
        long totalCategories,
        long trendingCount,
        long bestSellerCount
) {
}
```

```java
package com.twogofindz.backend.dto.response;

import java.time.LocalDate;

public record DailyCountResponse(LocalDate date, long count) {
}
```

```java
package com.twogofindz.backend.dto.response;

public record MonthlyCountResponse(String yearMonth, long count) {
}
```

```java
package com.twogofindz.backend.dto.response;

public record ProductClickCountResponse(Long productId, String productName, long clickCount) {
}
```

```java
package com.twogofindz.backend.dto.response;

import java.math.BigDecimal;

public record CategoryCommissionResponse(Long categoryId, String categoryName, BigDecimal estimatedCommission) {
}
```

```java
package com.twogofindz.backend.dto.response;

import java.util.List;

public record DashboardAnalyticsResponse(
        List<DailyCountResponse> viewsByDay,
        List<DailyCountResponse> clicksByDay,
        List<ProductClickCountResponse> mostClickedProducts,
        List<CategoryCommissionResponse> commissionByCategory,
        List<MonthlyCountResponse> productsAddedByMonth
) {
}
```

**Service interface (fixed):**

```java
package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.response.DashboardAnalyticsResponse;
import com.twogofindz.backend.dto.response.DashboardSummaryResponse;

import java.time.LocalDate;

public interface DashboardService {
    DashboardSummaryResponse getSummary(LocalDate from, LocalDate to);
    DashboardAnalyticsResponse getAnalytics(LocalDate from, LocalDate to);
}
```

**Controller (fixed):**

```java
package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.DashboardAnalyticsResponse;
import com.twogofindz.backend.dto.response.DashboardSummaryResponse;
import com.twogofindz.backend.service.DashboardService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    private final DashboardService dashboardService;

    public AdminDashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public ApiResponse<DashboardSummaryResponse> summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.success("Dashboard summary retrieved successfully.", dashboardService.getSummary(from, to));
    }

    @GetMapping("/analytics")
    public ApiResponse<DashboardAnalyticsResponse> analytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.success("Dashboard analytics retrieved successfully.", dashboardService.getAnalytics(from, to));
    }
}
```

**Business rules `DashboardServiceImpl` must satisfy (design the internals yourself; these are invariants, not suggestions):**

1. `from`/`to` are both optional. When both are null, every metric is computed over all-time data. When given, `from` is inclusive at 00:00:00 and `to` is inclusive through 23:59:59 of that day (convert the `LocalDate` bounds to `LocalDateTime` accordingly when comparing against `viewedAt`/`clickedAt`).
2. `totalViews`, `totalClicks`, and `estimatedTotalCommission` respect the `from`/`to` filter (they're derived from timestamped events).
3. `totalProducts` = count of **all** products regardless of `active` flag (soft-deleted products still count toward "total ever added" — this is not filtered by `from`/`to`).
4. `totalCategories` = count of all categories (not filtered by `from`/`to`).
5. `trendingCount`/`bestSellerCount` = count of **active** products with `trending`/`bestSeller` true, respectively (reflects current storefront state, not filtered by `from`/`to`). Add `ProductRepository.countByActiveTrueAndTrendingTrue(): long` and `.countByActiveTrueAndBestSellerTrue(): long` (Spring Data derives these automatically from the method name).
6. Estimated commission per product = `productPrice × (categoryCommissionRate / 100) × clicksOnThatProductWithinRange`. `commissionByCategory` sums this across every product in each category, and **only includes categories that have at least one commission-generating click in the given range** (a category with zero clicks in range is omitted from the list, not returned with a zero value) — keeps the list meaningful rather than padded with every category that's ever existed.
7. `mostClickedProducts` is ordered by click count descending, limited to a reasonable top-N (10 is fine), and excludes products with zero clicks in range.
8. `viewsByDay`/`clicksByDay` group by calendar date (not full timestamp); `productsAddedByMonth` groups by calendar month formatted as `"yyyy-MM"` (e.g. `"2026-07"`), and — unlike the range-filtered metrics — reflects all products ever created (use `from`/`to` if given to bound it, but don't require it).
9. Use `BigDecimal` throughout the commission math — never `double`/`float`. Round to 2 decimal places (`RoundingMode.HALF_UP`) for the final response values.

**Required test (fixed — this is the correctness contract for the commission math; write additional tests as you see fit, but this one must pass exactly as specified):**

```java
package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.ProductRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminDashboardControllerTest extends AbstractIntegrationTest {

    @Test
    void analytics_computesEstimatedCommission_forExactlyThreeClicks() throws Exception {
        String token = adminToken();

        // 10.00% commission rate category
        var categoryResult = mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new com.twogofindz.backend.dto.request.CategoryRequest(
                                        "Commission Math Category", new BigDecimal("10.00")))))
                .andReturn();
        Long categoryId = objectMapper.readTree(categoryResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // $50.00 product
        var productResult = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ProductRequest(
                                "Commission Math Product", "For commission math.", categoryId, null,
                                new BigDecimal("50.00"), "https://amazon.com/dp/commissionmath",
                                false, false, true))))
                .andReturn();
        Long productId = objectMapper.readTree(productResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Exactly 3 tracked clicks
        for (int i = 0; i < 3; i++) {
            mockMvc.perform(post("/api/public/products/{id}/click", productId));
        }

        // Expected: 50.00 * (10.00 / 100) * 3 = 15.00
        mockMvc.perform(get("/api/admin/dashboard/analytics")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.commissionByCategory[?(@.categoryName == 'Commission Math Category')].estimatedCommission")
                        .value(org.hamcrest.Matchers.contains(15.00)));
    }

    @Test
    void summary_returns401_withoutToken() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard/summary"))
                .andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 1: Write the failing tests**

Write `AdminDashboardControllerTest.java` exactly as specified above.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && mvn test -Dtest=AdminDashboardControllerTest`
Expected: FAIL — compilation error (none of the classes below exist yet).

- [ ] **Step 3: Write the six DTOs**

Write `DashboardSummaryResponse`, `DailyCountResponse`, `MonthlyCountResponse`, `ProductClickCountResponse`, `CategoryCommissionResponse`, `DashboardAnalyticsResponse` exactly as specified in the DTO contracts above.

- [ ] **Step 4: Add the two count methods to `ProductRepository`**

```java
long countByActiveTrueAndTrendingTrue();
long countByActiveTrueAndBestSellerTrue();
```

- [ ] **Step 5: Design and implement `DashboardServiceImpl`**

Add whatever query methods you need to `WebsiteViewRepository` and `ProductClickRepository` (native `@Query` aggregations, JPQL, or fetching rows and aggregating in the service layer are all acceptable — pick whichever you're confident is correct and maintainable). Implement `DashboardService` satisfying every business rule above. Write `AdminDashboardController` exactly as specified.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && mvn test -Dtest=AdminDashboardControllerTest`
Expected: PASS — in particular, the commission math test must return exactly `15.00` (not `15.0`, `15`, or a floating-point-imprecise neighbor) for the `Commission Math Category` entry.

- [ ] **Step 7: Run the full suite to confirm no regressions**

Run: `cd backend && mvn test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/dto/response/DashboardSummaryResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/DailyCountResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/MonthlyCountResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/ProductClickCountResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/CategoryCommissionResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/DashboardAnalyticsResponse.java \
        backend/src/main/java/com/twogofindz/backend/service/DashboardService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/DashboardServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/controller/admin/AdminDashboardController.java \
        backend/src/main/java/com/twogofindz/backend/repository/ProductRepository.java \
        backend/src/main/java/com/twogofindz/backend/repository/WebsiteViewRepository.java \
        backend/src/main/java/com/twogofindz/backend/repository/ProductClickRepository.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminDashboardControllerTest.java
git commit -m "feat: add dashboard analytics with estimated commission calculation"
```

---

### Task 6: Cross-cutting authorization coverage + final verification

**Files:**
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/AuthorizationTest.java` (extend with this stage's new endpoints)

**Interfaces:**
- Consumes: every controller from Tasks 1–5
- Produces: nothing further downstream — this stage's final verification gate.

- [ ] **Step 1: Modify `AuthorizationTest` to cover the new endpoints**

Add these test methods to the existing file (keep the three Stage 1 tests unchanged):

```java
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
```

- [ ] **Step 2: Run the test**

Run: `cd backend && mvn test -Dtest=AuthorizationTest`
Expected: PASS

- [ ] **Step 3: Run the entire test suite one final time**

Run: `cd backend && mvn test`
Expected: PASS — every test from Stage 1 plus Tasks 1 through 6 of this stage.

- [ ] **Step 4: Verify migrations apply cleanly against real local MySQL**

Using the same local MySQL instance from Stage 1's verification (do not create a new database — this proves the new migrations layer correctly on top of the existing schema):
```bash
cd backend
export $(grep -v '^#' .env | xargs)
mvn spring-boot:run
```
In a second terminal, confirm the app boots (Flyway should report migrating to version 7) and spot-check one new endpoint:
```bash
curl -s -X POST http://localhost:8080/api/public/views | python3 -m json.tool
```
Expected: JSON response with `"success": true` and a non-empty `data.sessionId`. Stop the app afterward.

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/java/com/twogofindz/backend/controller/AuthorizationTest.java
git commit -m "test: extend authorization coverage to Stage 2 endpoints"
```
