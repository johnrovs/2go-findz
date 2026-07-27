# Hero Banners Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Hero Banners feature — a new `hero_banners` backend entity with admin CRUD, and a public `HeroCarousel` that displays them, falling back to the existing unmodified `HeroSection` when none are configured.

**Architecture:** Backend follows the exact `ProductCategory` vertical's conventions (manual mapper, DB-managed timestamps, plain derived-query repository methods, `ResourceNotFoundException` reuse, MockMvc integration tests via `AbstractIntegrationTest`). Frontend: a new `HeroBannerManager` component (self-contained fetch/CRUD) is added inside the existing `SettingsPage`; a new `HeroCarousel`/`HeroSlide` pair renders on the public homepage, with `HeroCarousel` delegating straight to the current `HeroSection` when the banner list is empty — zero risk to already-tested behavior.

**Tech Stack:** Backend: Java 21, Spring Boot, Spring Data JPA, Flyway, JUnit 5, MockMvc. Frontend: React JS/JSX, Vite, Tailwind, React Router DOM, Framer Motion, Vitest + React Testing Library. No new dependencies.

## Global Constraints

- Full design detail: `docs/superpowers/specs/2026-07-27-hero-banners-design.md`. This feature is beyond `docs/PROJECT_SPEC.md`'s original scope — added directly at user request.
- Migration file: `V8__create_hero_banners_table.sql` (current latest is `V7__create_system_settings_table.sql`).
- `image_filename` and `image_alt` are both `NOT NULL` at the DB/entity level — every persisted banner always has a real image and real alt text. The "no image" case is handled entirely by `HeroCarousel` falling back to `HeroSection` when the banner list is empty, never by a null image on a persisted banner.
- `button_link` is an internal route (e.g. `/trending`), validated server-side with `@Pattern(regexp = "^/.*", ...)` — not an external HTTPS URL like `ProductRequest.productLink`.
- No new admin sidebar item — banner management lives inside the existing `SettingsPage` via a new `HeroBannerManager` component.
- Delete is a real hard delete (no soft-delete/"deactivate" framing) — hero banners have no downstream references.
- All frontend backend calls go through the existing shared `api` Axios instance. Errors normalize to `{ message, fieldErrors }` via the existing `normalizeError` in `api.js`.
- Reused as-is, no modifications: `DataTable`, `Modal`, `ConfirmDialog`, `ImageUploader`, `EmptyState`, `ErrorState`, `useToast`, `getImageUrl`, `HeroSection` (completely unchanged).
- TDD throughout: write the failing test, confirm RED, implement, confirm GREEN, run the full suite, commit — every task.
- Never commit `.env`.

---

### Task 1: Backend — HeroBanner admin CRUD vertical

**Files:**
- Create: `backend/src/main/resources/db/migration/V8__create_hero_banners_table.sql`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/HeroBanner.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/HeroBannerRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/HeroBannerResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicHeroBannerResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/mapper/HeroBannerMapper.java`
- Create: `backend/src/main/java/com/twogofindz/backend/repository/HeroBannerRepository.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/HeroBannerService.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/impl/HeroBannerServiceImpl.java`
- Create: `backend/src/main/java/com/twogofindz/backend/controller/admin/AdminHeroBannerController.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminHeroBannerControllerTest.java`

**Interfaces:**
- Produces: `HeroBannerService.create/update/getAllForAdmin/getAllForPublic/delete`, `HeroBannerRepository.findAllByOrderByDisplayOrderAsc()/findByActiveTrueOrderByDisplayOrderAsc()`, `HeroBannerMapper.toResponse(...)/toPublicResponse(...)`. `getAllForPublic()`/`toPublicResponse(...)` are implemented now (trivial) but not yet exposed via any controller — Task 2 adds the public controller that calls them.

- [ ] **Step 1: Write the failing test**

```java
package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.HeroBannerRequest;
import org.junit.jupiter.api.Test;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminHeroBannerControllerTest extends AbstractIntegrationTest {

    private HeroBannerRequest validRequest(String imageFilename) {
        return new HeroBannerRequest(
                imageFilename,
                "Curated collection of trending gadgets and home products",
                "Trending Today",
                "Amazon Finds Everyone Is Talking About",
                "Discover trending products, useful gadgets, and everyday essentials.",
                "Explore Trending Finds",
                "/trending",
                1,
                true
        );
    }

    @Test
    void create_succeeds_withValidPayload() throws Exception {
        String token = adminToken();
        String imageFilename = uploadTestImage(token);

        mockMvc.perform(post("/api/admin/hero-banners")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest(imageFilename))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.headline").value("Amazon Finds Everyone Is Talking About"))
                .andExpect(jsonPath("$.data.buttonLink").value("/trending"))
                .andExpect(jsonPath("$.data.active").value(true));
    }

    @Test
    void create_returns400_whenHeadlineBlank() throws Exception {
        String token = adminToken();
        String imageFilename = uploadTestImage(token);
        HeroBannerRequest request = new HeroBannerRequest(
                imageFilename, "Alt text", "Badge", "", "Description", "Button", "/trending", 1, true);

        mockMvc.perform(post("/api/admin/hero-banners")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenButtonLinkIsNotAnInternalPath() throws Exception {
        String token = adminToken();
        String imageFilename = uploadTestImage(token);
        HeroBannerRequest request = new HeroBannerRequest(
                imageFilename, "Alt text", "Badge", "Headline", "Description", "Button",
                "https://example.com", 1, true);

        mockMvc.perform(post("/api/admin/hero-banners")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns401_withoutToken() throws Exception {
        mockMvc.perform(post("/api/admin/hero-banners")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest("img.jpg"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void update_succeeds_andGetAllReflectsChange() throws Exception {
        String token = adminToken();
        String imageFilename = uploadTestImage(token);

        var createResult = mockMvc.perform(post("/api/admin/hero-banners")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest(imageFilename))))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        HeroBannerRequest updateRequest = new HeroBannerRequest(
                imageFilename, "Updated alt text", "Updated Badge", "Updated Headline",
                "Updated description.", "Updated Button", "/categories", 2, false);

        mockMvc.perform(put("/api/admin/hero-banners/{id}", id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.headline").value("Updated Headline"))
                .andExpect(jsonPath("$.data.active").value(false));

        mockMvc.perform(get("/api/admin/hero-banners")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].headline").value("Updated Headline"));
    }

    @Test
    void delete_succeeds_andRemovesFromGetAll() throws Exception {
        String token = adminToken();
        String imageFilename = uploadTestImage(token);

        var createResult = mockMvc.perform(post("/api/admin/hero-banners")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest(imageFilename))))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(delete("/api/admin/hero-banners/{id}", id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/hero-banners")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && mvn test -Dtest=AdminHeroBannerControllerTest`
Expected: FAIL — compilation error, none of the referenced classes exist yet.

- [ ] **Step 3: Create the migration**

```sql
CREATE TABLE hero_banners (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    image_filename VARCHAR(255) NOT NULL,
    image_alt VARCHAR(255) NOT NULL,
    badge VARCHAR(100) NULL,
    headline VARCHAR(200) NOT NULL,
    description TEXT NULL,
    button_text VARCHAR(100) NOT NULL,
    button_link VARCHAR(255) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hero_banners_active_order (active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 4: Create the entity**

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
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import java.time.LocalDateTime;

@Entity
@Table(name = "hero_banners")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HeroBanner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "image_filename", nullable = false, length = 255)
    private String imageFilename;

    @Column(name = "image_alt", nullable = false, length = 255)
    private String imageAlt;

    @Column(name = "badge", length = 100)
    private String badge;

    @Column(name = "headline", nullable = false, length = 200)
    private String headline;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "button_text", nullable = false, length = 100)
    private String buttonText;

    @Column(name = "button_link", nullable = false, length = 255)
    private String buttonLink;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(name = "active", nullable = false)
    private Boolean active;

    @Generated(event = {EventType.INSERT, EventType.UPDATE})
    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private LocalDateTime createdAt;

    @Generated(event = {EventType.INSERT, EventType.UPDATE})
    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
```

- [ ] **Step 5: Create the DTOs**

```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record HeroBannerRequest(
        @NotBlank(message = "Slide image is required.")
        @Size(max = 255, message = "Image filename must be at most 255 characters.")
        String imageFilename,

        @NotBlank(message = "Image alt text is required.")
        @Size(max = 255, message = "Image alt text must be at most 255 characters.")
        String imageAlt,

        String badge,

        @NotBlank(message = "Headline is required.")
        @Size(max = 200, message = "Headline must be at most 200 characters.")
        String headline,

        String description,

        @NotBlank(message = "Button text is required.")
        @Size(max = 100, message = "Button text must be at most 100 characters.")
        String buttonText,

        @NotBlank(message = "Button link is required.")
        @Pattern(regexp = "^/.*", message = "Button link must be an internal path starting with /.")
        @Size(max = 255, message = "Button link must be at most 255 characters.")
        String buttonLink,

        @NotNull(message = "Display order is required.")
        Integer displayOrder,

        @NotNull(message = "Active flag is required.")
        Boolean active
) {
}
```

```java
package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;

public record HeroBannerResponse(
        Long id,
        String imageFilename,
        String imageAlt,
        String badge,
        String headline,
        String description,
        String buttonText,
        String buttonLink,
        Integer displayOrder,
        Boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
```

```java
package com.twogofindz.backend.dto.response;

public record PublicHeroBannerResponse(
        Long id,
        String imageFilename,
        String imageAlt,
        String badge,
        String headline,
        String description,
        String buttonText,
        String buttonLink
) {
}
```

- [ ] **Step 6: Create the mapper**

```java
package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.HeroBannerResponse;
import com.twogofindz.backend.dto.response.PublicHeroBannerResponse;
import com.twogofindz.backend.entity.HeroBanner;
import org.springframework.stereotype.Component;

@Component
public class HeroBannerMapper {

    public HeroBannerResponse toResponse(HeroBanner banner) {
        return new HeroBannerResponse(
                banner.getId(),
                banner.getImageFilename(),
                banner.getImageAlt(),
                banner.getBadge(),
                banner.getHeadline(),
                banner.getDescription(),
                banner.getButtonText(),
                banner.getButtonLink(),
                banner.getDisplayOrder(),
                banner.getActive(),
                banner.getCreatedAt(),
                banner.getUpdatedAt()
        );
    }

    public PublicHeroBannerResponse toPublicResponse(HeroBanner banner) {
        return new PublicHeroBannerResponse(
                banner.getId(),
                banner.getImageFilename(),
                banner.getImageAlt(),
                banner.getBadge(),
                banner.getHeadline(),
                banner.getDescription(),
                banner.getButtonText(),
                banner.getButtonLink()
        );
    }
}
```

- [ ] **Step 7: Create the repository**

```java
package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.HeroBanner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HeroBannerRepository extends JpaRepository<HeroBanner, Long> {
    List<HeroBanner> findAllByOrderByDisplayOrderAsc();
    List<HeroBanner> findByActiveTrueOrderByDisplayOrderAsc();
}
```

- [ ] **Step 8: Create the service interface and implementation**

```java
package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.HeroBannerRequest;
import com.twogofindz.backend.dto.response.HeroBannerResponse;
import com.twogofindz.backend.dto.response.PublicHeroBannerResponse;

import java.util.List;

public interface HeroBannerService {
    HeroBannerResponse create(HeroBannerRequest request);
    HeroBannerResponse update(Long id, HeroBannerRequest request);
    List<HeroBannerResponse> getAllForAdmin();
    List<PublicHeroBannerResponse> getAllForPublic();
    void delete(Long id);
}
```

```java
package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.HeroBannerRequest;
import com.twogofindz.backend.dto.response.HeroBannerResponse;
import com.twogofindz.backend.dto.response.PublicHeroBannerResponse;
import com.twogofindz.backend.entity.HeroBanner;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.mapper.HeroBannerMapper;
import com.twogofindz.backend.repository.HeroBannerRepository;
import com.twogofindz.backend.service.HeroBannerService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class HeroBannerServiceImpl implements HeroBannerService {

    private final HeroBannerRepository heroBannerRepository;
    private final HeroBannerMapper heroBannerMapper;

    public HeroBannerServiceImpl(HeroBannerRepository heroBannerRepository, HeroBannerMapper heroBannerMapper) {
        this.heroBannerRepository = heroBannerRepository;
        this.heroBannerMapper = heroBannerMapper;
    }

    @Override
    @Transactional
    public HeroBannerResponse create(HeroBannerRequest request) {
        HeroBanner banner = HeroBanner.builder()
                .imageFilename(request.imageFilename())
                .imageAlt(request.imageAlt())
                .badge(request.badge())
                .headline(request.headline())
                .description(request.description())
                .buttonText(request.buttonText())
                .buttonLink(request.buttonLink())
                .displayOrder(request.displayOrder())
                .active(request.active())
                .build();
        return heroBannerMapper.toResponse(heroBannerRepository.save(banner));
    }

    @Override
    @Transactional
    public HeroBannerResponse update(Long id, HeroBannerRequest request) {
        HeroBanner banner = findEntityById(id);
        banner.setImageFilename(request.imageFilename());
        banner.setImageAlt(request.imageAlt());
        banner.setBadge(request.badge());
        banner.setHeadline(request.headline());
        banner.setDescription(request.description());
        banner.setButtonText(request.buttonText());
        banner.setButtonLink(request.buttonLink());
        banner.setDisplayOrder(request.displayOrder());
        banner.setActive(request.active());
        return heroBannerMapper.toResponse(heroBannerRepository.save(banner));
    }

    @Override
    public List<HeroBannerResponse> getAllForAdmin() {
        return heroBannerRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(heroBannerMapper::toResponse)
                .toList();
    }

    @Override
    public List<PublicHeroBannerResponse> getAllForPublic() {
        return heroBannerRepository.findByActiveTrueOrderByDisplayOrderAsc().stream()
                .map(heroBannerMapper::toPublicResponse)
                .toList();
    }

    @Override
    @Transactional
    public void delete(Long id) {
        heroBannerRepository.delete(findEntityById(id));
    }

    private HeroBanner findEntityById(Long id) {
        return heroBannerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hero banner not found with id: " + id));
    }
}
```

- [ ] **Step 9: Create the admin controller**

```java
package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.dto.request.HeroBannerRequest;
import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.HeroBannerResponse;
import com.twogofindz.backend.service.HeroBannerService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/hero-banners")
public class AdminHeroBannerController {

    private final HeroBannerService heroBannerService;

    public AdminHeroBannerController(HeroBannerService heroBannerService) {
        this.heroBannerService = heroBannerService;
    }

    @GetMapping
    public ApiResponse<List<HeroBannerResponse>> getAll() {
        return ApiResponse.success("Hero banners retrieved successfully.", heroBannerService.getAllForAdmin());
    }

    @PostMapping
    public ApiResponse<HeroBannerResponse> create(@Valid @RequestBody HeroBannerRequest request) {
        return ApiResponse.success("Hero banner created successfully.", heroBannerService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<HeroBannerResponse> update(@PathVariable Long id, @Valid @RequestBody HeroBannerRequest request) {
        return ApiResponse.success("Hero banner updated successfully.", heroBannerService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        heroBannerService.delete(id);
        return ApiResponse.success("Hero banner deleted successfully.");
    }
}
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `cd backend && mvn test -Dtest=AdminHeroBannerControllerTest`
Expected: PASS (6 tests)

- [ ] **Step 11: Commit**

```bash
git add backend/src/main/resources/db/migration/V8__create_hero_banners_table.sql \
        backend/src/main/java/com/twogofindz/backend/entity/HeroBanner.java \
        backend/src/main/java/com/twogofindz/backend/dto/request/HeroBannerRequest.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/HeroBannerResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/PublicHeroBannerResponse.java \
        backend/src/main/java/com/twogofindz/backend/mapper/HeroBannerMapper.java \
        backend/src/main/java/com/twogofindz/backend/repository/HeroBannerRepository.java \
        backend/src/main/java/com/twogofindz/backend/service/HeroBannerService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/HeroBannerServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/controller/admin/AdminHeroBannerController.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminHeroBannerControllerTest.java
git commit -m "feat: add HeroBanner backend entity and admin CRUD"
```

---

### Task 2: Backend — Public hero banners endpoint

**Files:**
- Create: `backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicHeroBannerController.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicHeroBannerControllerTest.java`

**Interfaces:**
- Consumes: `HeroBannerService.getAllForPublic()` from Task 1.
- Produces: `GET /api/public/hero-banners` → `ApiResponse<List<PublicHeroBannerResponse>>`.

- [ ] **Step 1: Write the failing test**

```java
package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.HeroBannerRequest;
import org.junit.jupiter.api.Test;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicHeroBannerControllerTest extends AbstractIntegrationTest {

    @Test
    void getAll_returnsOnlyActiveBanners_orderedByDisplayOrder() throws Exception {
        String token = adminToken();
        String imageFilename = uploadTestImage(token);

        mockMvc.perform(post("/api/admin/hero-banners")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new HeroBannerRequest(
                        imageFilename, "Alt one", "Badge", "Second Slide", "Desc", "Button", "/trending", 2, true))));

        mockMvc.perform(post("/api/admin/hero-banners")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new HeroBannerRequest(
                        imageFilename, "Alt two", "Badge", "First Slide", "Desc", "Button", "/categories", 1, true))));

        mockMvc.perform(post("/api/admin/hero-banners")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new HeroBannerRequest(
                        imageFilename, "Alt three", "Badge", "Inactive Slide", "Desc", "Button", "/guides", 3, false))));

        mockMvc.perform(get("/api/public/hero-banners"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].headline").value("First Slide"))
                .andExpect(jsonPath("$.data[1].headline").value("Second Slide"));
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && mvn test -Dtest=PublicHeroBannerControllerTest`
Expected: FAIL — `PublicHeroBannerController` does not exist yet.

- [ ] **Step 3: Write the implementation**

```java
package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.PublicHeroBannerResponse;
import com.twogofindz.backend.service.HeroBannerService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/hero-banners")
public class PublicHeroBannerController {

    private final HeroBannerService heroBannerService;

    public PublicHeroBannerController(HeroBannerService heroBannerService) {
        this.heroBannerService = heroBannerService;
    }

    @GetMapping
    public ApiResponse<List<PublicHeroBannerResponse>> getAll() {
        return ApiResponse.success("Hero banners retrieved successfully.", heroBannerService.getAllForPublic());
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && mvn test -Dtest=PublicHeroBannerControllerTest`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicHeroBannerController.java \
        backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicHeroBannerControllerTest.java
git commit -m "feat: add public hero banners endpoint"
```

---

### Task 3: Frontend — `adminHeroBannerService`

**Files:**
- Create: `frontend/src/services/adminHeroBannerService.js`
- Test: `frontend/src/services/adminHeroBannerService.test.js`

**Interfaces:**
- Produces: `getHeroBanners(): Promise<Banner[]>`, `createHeroBanner(payload): Promise<Banner>`, `updateHeroBanner(id, payload): Promise<Banner>`, `deleteHeroBanner(id): Promise<void>`. Consumed by `HeroBannerManager` (Task 8).

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import { getHeroBanners, createHeroBanner, updateHeroBanner, deleteHeroBanner } from './adminHeroBannerService.js';

describe('adminHeroBannerService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getHeroBanners fetches from /admin/hero-banners and returns the list', async () => {
    const banners = [{ id: 1, headline: 'Amazon Finds Everyone Is Talking About' }];
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Hero banners retrieved successfully.', data: banners },
    });

    const result = await getHeroBanners();

    expect(api.get).toHaveBeenCalledWith('/admin/hero-banners');
    expect(result).toEqual(banners);
  });

  it('createHeroBanner posts the payload and returns the created banner', async () => {
    const created = { id: 2, headline: 'Find the Right Product Faster' };
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { success: true, message: 'Hero banner created successfully.', data: created },
    });

    const payload = { headline: 'Find the Right Product Faster' };
    const result = await createHeroBanner(payload);

    expect(api.post).toHaveBeenCalledWith('/admin/hero-banners', payload);
    expect(result).toEqual(created);
  });

  it('updateHeroBanner puts the payload to the banner id and returns the updated banner', async () => {
    const updated = { id: 2, headline: 'Updated Headline' };
    vi.spyOn(api, 'put').mockResolvedValue({
      data: { success: true, message: 'Hero banner updated successfully.', data: updated },
    });

    const payload = { headline: 'Updated Headline' };
    const result = await updateHeroBanner(2, payload);

    expect(api.put).toHaveBeenCalledWith('/admin/hero-banners/2', payload);
    expect(result).toEqual(updated);
  });

  it('deleteHeroBanner sends a delete request for the banner id', async () => {
    vi.spyOn(api, 'delete').mockResolvedValue({
      data: { success: true, message: 'Hero banner deleted successfully.', data: null },
    });

    await deleteHeroBanner(2);

    expect(api.delete).toHaveBeenCalledWith('/admin/hero-banners/2');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- adminHeroBannerService.test.js`
Expected: FAIL — `adminHeroBannerService.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```javascript
import api from './api.js';

export async function getHeroBanners() {
  const response = await api.get('/admin/hero-banners');
  return response.data.data;
}

export async function createHeroBanner(payload) {
  const response = await api.post('/admin/hero-banners', payload);
  return response.data.data;
}

export async function updateHeroBanner(id, payload) {
  const response = await api.put(`/admin/hero-banners/${id}`, payload);
  return response.data.data;
}

export async function deleteHeroBanner(id) {
  await api.delete(`/admin/hero-banners/${id}`);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- adminHeroBannerService.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/adminHeroBannerService.js frontend/src/services/adminHeroBannerService.test.js
git commit -m "feat: add adminHeroBannerService for hero banner CRUD"
```

---

### Task 4: Frontend — `heroBannerService` (public)

**Files:**
- Create: `frontend/src/services/heroBannerService.js`
- Test: `frontend/src/services/heroBannerService.test.js`

**Interfaces:**
- Produces: `getHeroBanners(): Promise<PublicBanner[]>`. Consumed by `HomePage` (Task 10). Distinct from `adminHeroBannerService.js` (same function name, different endpoint — mirrors the existing `settingsService.js`/`adminSettingsService.js` split).

- [ ] **Step 1: Write the failing test**

```javascript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import { getHeroBanners } from './heroBannerService.js';

describe('heroBannerService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getHeroBanners fetches from /public/hero-banners and returns the list', async () => {
    const banners = [{ id: 1, headline: 'Amazon Finds Everyone Is Talking About' }];
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Hero banners retrieved successfully.', data: banners },
    });

    const result = await getHeroBanners();

    expect(api.get).toHaveBeenCalledWith('/public/hero-banners');
    expect(result).toEqual(banners);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- heroBannerService.test.js`
Expected: FAIL — `heroBannerService.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```javascript
import api from './api.js';

export async function getHeroBanners() {
  const response = await api.get('/public/hero-banners');
  return response.data.data;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- heroBannerService.test.js`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/heroBannerService.js frontend/src/services/heroBannerService.test.js
git commit -m "feat: add public heroBannerService"
```

---

### Task 5: Frontend — `HeroSlide`

**Files:**
- Create: `frontend/src/components/HeroSlide.jsx`
- Test: `frontend/src/components/HeroSlide.test.jsx`

**Interfaces:**
- Produces: `HeroSlide({ imageUrl, imageAlt, badge, headline, description, buttonText, buttonTo, onButtonClick, isPriority })` (default export). Exactly one of `buttonTo` (renders `<Link to={buttonTo}>`) or `onButtonClick` (renders `<button>`) is expected per usage. Used by `HeroCarousel` (Task 6).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import HeroSlide from './HeroSlide.jsx';

function renderSlide(props) {
  return render(
    <MemoryRouter>
      <HeroSlide
        imageUrl="https://example.com/uploads/img_1.webp"
        imageAlt="Curated collection of trending gadgets"
        badge="Trending Today"
        headline="Amazon Finds Everyone Is Talking About"
        description="Discover trending products."
        buttonText="Explore Trending Finds"
        isPriority={false}
        {...props}
      />
    </MemoryRouter>
  );
}

describe('HeroSlide', () => {
  it('renders the image with the provided alt text', () => {
    renderSlide({});
    expect(screen.getByAltText('Curated collection of trending gadgets')).toBeInTheDocument();
  });

  it('renders the badge, headline, and description', () => {
    renderSlide({});
    expect(screen.getByText('Trending Today')).toBeInTheDocument();
    expect(screen.getByText('Amazon Finds Everyone Is Talking About')).toBeInTheDocument();
    expect(screen.getByText('Discover trending products.')).toBeInTheDocument();
  });

  it('renders the button as a Link when buttonTo is provided', () => {
    renderSlide({ buttonTo: '/trending' });
    expect(screen.getByRole('link', { name: 'Explore Trending Finds' })).toHaveAttribute('href', '/trending');
  });

  it('renders the button as a button when onButtonClick is provided', async () => {
    const onButtonClick = vi.fn();
    renderSlide({ onButtonClick });
    expect(screen.getByRole('button', { name: 'Explore Trending Finds' })).toBeInTheDocument();
  });

  it('eager-loads the image when isPriority is true, lazy-loads otherwise', () => {
    const { rerender } = renderSlide({ isPriority: true });
    expect(screen.getByAltText('Curated collection of trending gadgets')).toHaveAttribute('loading', 'eager');

    rerender(
      <MemoryRouter>
        <HeroSlide
          imageUrl="https://example.com/uploads/img_1.webp"
          imageAlt="Curated collection of trending gadgets"
          headline="Amazon Finds Everyone Is Talking About"
          buttonText="Explore Trending Finds"
          buttonTo="/trending"
          isPriority={false}
        />
      </MemoryRouter>
    );
    expect(screen.getByAltText('Curated collection of trending gadgets')).toHaveAttribute('loading', 'lazy');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- HeroSlide.test.jsx`
Expected: FAIL — `HeroSlide.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { Link } from 'react-router-dom';

function HeroSlide({
  imageUrl,
  imageAlt,
  badge,
  headline,
  description,
  buttonText,
  buttonTo,
  onButtonClick,
  isPriority,
}) {
  const buttonClassName =
    'inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2';

  return (
    <div className="relative flex min-h-[420px] items-center overflow-hidden bg-slate-900 sm:min-h-[480px]">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={imageAlt}
          loading={isPriority ? 'eager' : 'lazy'}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-slate-900/10" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          {badge && (
            <span className="mb-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              {badge}
            </span>
          )}
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">{headline}</h1>
          {description && <p className="mt-4 text-lg text-slate-200">{description}</p>}
          <div className="mt-8">
            {buttonTo ? (
              <Link to={buttonTo} className={buttonClassName}>
                {buttonText}
              </Link>
            ) : (
              <button type="button" onClick={onButtonClick} className={buttonClassName}>
                {buttonText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroSlide;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- HeroSlide.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/HeroSlide.jsx frontend/src/components/HeroSlide.test.jsx
git commit -m "feat: add HeroSlide component"
```

---

### Task 6: Frontend — `HeroCarousel`

**Files:**
- Create: `frontend/src/components/HeroCarousel.jsx`
- Test: `frontend/src/components/HeroCarousel.test.jsx`

**Interfaces:**
- Consumes: `HeroSlide` from Task 5 (exact prop names above); `HeroSection` (existing, unmodified, `frontend/src/components/HeroSection.jsx`).
- Produces: `HeroCarousel({ banners, heroSectionProps })` (default export). `banners` is `Banner[]` (`{ id, imageFilename, imageAlt, badge, headline, description, buttonText, buttonLink }` — note: raw `imageFilename`, not a resolved URL; `HeroCarousel` resolves it via `getImageUrl`). `heroSectionProps` is forwarded as-is to `HeroSection` when `banners` is empty. Used by `HomePage` (Task 10).

- [ ] **Step 1: Write the failing tests**

```jsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import HeroCarousel from './HeroCarousel.jsx';

const heroSectionProps = {
  headline: 'Smart Finds. Better Buys.',
  description: 'Discover trending products.',
  onExploreClick: vi.fn(),
  onTrendingClick: vi.fn(),
};

const banners = [
  {
    id: 1,
    imageFilename: 'img_1.webp',
    imageAlt: 'Trending gadgets',
    badge: 'Trending Today',
    headline: 'Amazon Finds Everyone Is Talking About',
    description: 'Discover trending products.',
    buttonText: 'Explore Trending Finds',
    buttonLink: '/trending',
  },
  {
    id: 2,
    imageFilename: 'img_2.webp',
    imageAlt: 'Category showcase',
    badge: 'Shop by Category',
    headline: 'Find the Right Product Faster',
    description: 'Browse curated recommendations.',
    buttonText: 'Browse Categories',
    buttonLink: '/categories',
  },
];

function renderCarousel(bannerList) {
  return render(
    <MemoryRouter>
      <HeroCarousel banners={bannerList} heroSectionProps={heroSectionProps} />
    </MemoryRouter>
  );
}

describe('HeroCarousel', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('renders the unmodified HeroSection when there are no banners', () => {
    renderCarousel([]);
    expect(screen.getByText('Smart Finds. Better Buys.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Next slide')).not.toBeInTheDocument();
  });

  it('renders a single chrome-less slide when there is exactly one banner', () => {
    renderCarousel([banners[0]]);
    expect(screen.getByText('Amazon Finds Everyone Is Talking About')).toBeInTheDocument();
    expect(screen.queryByLabelText('Next slide')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Go to slide 1')).not.toBeInTheDocument();
  });

  it('renders carousel chrome for two or more banners', () => {
    renderCarousel(banners);
    expect(screen.getByLabelText('Previous slide')).toBeInTheDocument();
    expect(screen.getByLabelText('Next slide')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to slide 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to slide 2')).toBeInTheDocument();
  });

  it('advances to the next slide automatically after 5 seconds', () => {
    vi.useFakeTimers();
    renderCarousel(banners);
    expect(screen.getByText('Amazon Finds Everyone Is Talking About')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('Find the Right Product Faster')).toBeInTheDocument();
  });

  it('pauses autoplay while the mouse is hovering the carousel', () => {
    vi.useFakeTimers();
    const { container } = renderCarousel(banners);

    fireEvent.mouseEnter(container.firstChild);
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('Amazon Finds Everyone Is Talking About')).toBeInTheDocument();
  });

  it('navigates via the next button', async () => {
    const user = userEvent.setup();
    renderCarousel(banners);

    await user.click(screen.getByLabelText('Next slide'));

    expect(screen.getByText('Find the Right Product Faster')).toBeInTheDocument();
  });

  it('navigates via a slide indicator', async () => {
    const user = userEvent.setup();
    renderCarousel(banners);

    await user.click(screen.getByLabelText('Go to slide 2'));

    expect(screen.getByText('Find the Right Product Faster')).toBeInTheDocument();
  });

  it('disables autoplay when the user prefers reduced motion', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
    vi.useFakeTimers();
    renderCarousel(banners);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByText('Amazon Finds Everyone Is Talking About')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- HeroCarousel.test.jsx`
Expected: FAIL — `HeroCarousel.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import HeroSlide from './HeroSlide.jsx';
import HeroSection from './HeroSection.jsx';
import { getImageUrl } from '../utils/imageUrl.js';

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD_PX = 50;

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    function handleChange(event) {
      setPrefersReducedMotion(event.matches);
    }
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

function HeroCarousel({ banners, heroSectionProps }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const slideCount = banners.length;

  useEffect(() => {
    if (slideCount <= 1 || isPaused || prefersReducedMotion) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [slideCount, isPaused, prefersReducedMotion]);

  if (slideCount === 0) {
    return <HeroSection {...heroSectionProps} />;
  }

  const activeBanner = banners[activeIndex];
  const slideProps = (banner, isPriority) => ({
    imageUrl: getImageUrl(banner.imageFilename),
    imageAlt: banner.imageAlt,
    badge: banner.badge,
    headline: banner.headline,
    description: banner.description,
    buttonText: banner.buttonText,
    buttonTo: banner.buttonLink,
    isPriority,
  });

  if (slideCount === 1) {
    return <HeroSlide {...slideProps(activeBanner, true)} />;
  }

  function goToSlide(index) {
    setActiveIndex(((index % slideCount) + slideCount) % slideCount);
  }

  function handleTouchStart(event) {
    touchStartXRef.current = event.touches[0].clientX;
  }

  function handleTouchEnd(event) {
    if (touchStartXRef.current === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (deltaX > SWIPE_THRESHOLD_PX) {
      goToSlide(activeIndex - 1);
    } else if (deltaX < -SWIPE_THRESHOLD_PX) {
      goToSlide(activeIndex + 1);
    }
  }

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeBanner.id}
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
        >
          <HeroSlide {...slideProps(activeBanner, activeIndex === 0)} />
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        onClick={() => goToSlide(activeIndex - 1)}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-900 shadow-md transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        onClick={() => goToSlide(activeIndex + 1)}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-900 shadow-md transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <ChevronRight size={20} />
      </button>

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {banners.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === activeIndex ? 'true' : undefined}
            className={`h-2.5 w-2.5 rounded-full transition ${index === activeIndex ? 'bg-white' : 'bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
}

export default HeroCarousel;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- HeroCarousel.test.jsx`
Expected: PASS (8 tests). If `window.matchMedia` is unavailable in jsdom rather than merely unstubbed (a `TypeError` rather than the stub simply not applying), add a default stub to `frontend/src/test/setup.js` following the exact pattern already there for `IntersectionObserver`/`ResizeObserver`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/HeroCarousel.jsx frontend/src/components/HeroCarousel.test.jsx
git commit -m "feat: add HeroCarousel component"
```

---

### Task 7: Frontend — `HeroBannerForm`

**Files:**
- Create: `frontend/src/components/HeroBannerForm.jsx`
- Test: `frontend/src/components/HeroBannerForm.test.jsx`

**Interfaces:**
- Consumes: `ImageUploader` (existing, `ImageUploader({ imageFileName, onChange })`).
- Produces: `HeroBannerForm({ banner, onSubmit, onCancel })` (default export). `banner` is `null` for create or a full banner object for edit. Calls `onSubmit({ imageFilename, imageAlt, badge, headline, description, buttonText, buttonLink, displayOrder, active })` — `badge`/`description` are `null` when blank (matching the backend's nullable columns), `displayOrder` is a number. `onSubmit` is expected to reject with `{ message, fieldErrors }` on failure. Used by `HeroBannerManager` (Task 8).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HeroBannerForm from './HeroBannerForm.jsx';

describe('HeroBannerForm', () => {
  it('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup();
    render(<HeroBannerForm banner={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Add Slide' }));

    expect(await screen.findByText('A slide image is required.')).toBeInTheDocument();
    expect(screen.getByText('Image alt text is required.')).toBeInTheDocument();
    expect(screen.getByText('Headline is required.')).toBeInTheDocument();
    expect(screen.getByText('Button text is required.')).toBeInTheDocument();
    expect(screen.getByText('Button link is required.')).toBeInTheDocument();
  });

  it('rejects a button link that is not an internal path', async () => {
    const user = userEvent.setup();
    render(<HeroBannerForm banner={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Button Link'), 'https://example.com');
    await user.click(screen.getByRole('button', { name: 'Add Slide' }));

    expect(await screen.findByText('Button link must be an internal path starting with /.')).toBeInTheDocument();
  });

  it('pre-fills fields and submits an update payload when editing', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const banner = {
      id: 1,
      imageFilename: 'img_existing.webp',
      imageAlt: 'Existing slide image',
      badge: 'Trending Today',
      headline: 'Amazon Finds Everyone Is Talking About',
      description: 'Discover trending products.',
      buttonText: 'Explore Trending Finds',
      buttonLink: '/trending',
      displayOrder: 1,
      active: true,
    };
    render(<HeroBannerForm banner={banner} onSubmit={onSubmit} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Headline')).toHaveValue('Amazon Finds Everyone Is Talking About');

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSubmit).toHaveBeenCalledWith({
      imageFilename: 'img_existing.webp',
      imageAlt: 'Existing slide image',
      badge: 'Trending Today',
      headline: 'Amazon Finds Everyone Is Talking About',
      description: 'Discover trending products.',
      buttonText: 'Explore Trending Finds',
      buttonLink: '/trending',
      displayOrder: 1,
      active: true,
    });
  });

  it('renders a server-side field error under the matching input', async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: 'Validation failed.',
      fieldErrors: { buttonLink: 'Button link must be an internal path starting with /.' },
    });
    const user = userEvent.setup();
    const banner = {
      id: 1,
      imageFilename: 'img_existing.webp',
      imageAlt: 'Existing slide image',
      badge: null,
      headline: 'Test Headline',
      description: null,
      buttonText: 'Learn More',
      buttonLink: '/trending',
      displayOrder: 1,
      active: true,
    };
    render(<HeroBannerForm banner={banner} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Button link must be an internal path starting with /.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- HeroBannerForm.test.jsx`
Expected: FAIL — `HeroBannerForm.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { useState } from 'react';
import ImageUploader from './ImageUploader.jsx';

function HeroBannerForm({ banner, onSubmit, onCancel }) {
  const [imageFilename, setImageFilename] = useState(banner?.imageFilename ?? null);
  const [imageAlt, setImageAlt] = useState(banner?.imageAlt ?? '');
  const [badge, setBadge] = useState(banner?.badge ?? '');
  const [headline, setHeadline] = useState(banner?.headline ?? '');
  const [description, setDescription] = useState(banner?.description ?? '');
  const [buttonText, setButtonText] = useState(banner?.buttonText ?? '');
  const [buttonLink, setButtonLink] = useState(banner?.buttonLink ?? '');
  const [displayOrder, setDisplayOrder] = useState(
    banner?.displayOrder !== undefined ? String(banner.displayOrder) : '0'
  );
  const [active, setActive] = useState(banner?.active ?? true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const errors = {};
    if (!imageFilename) errors.imageFilename = 'A slide image is required.';
    if (!imageAlt.trim()) errors.imageAlt = 'Image alt text is required.';
    if (!headline.trim()) errors.headline = 'Headline is required.';
    if (!buttonText.trim()) errors.buttonText = 'Button text is required.';
    if (!buttonLink.trim()) {
      errors.buttonLink = 'Button link is required.';
    } else if (!buttonLink.trim().startsWith('/')) {
      errors.buttonLink = 'Button link must be an internal path starting with /.';
    }
    if (displayOrder === '' || Number.isNaN(Number(displayOrder))) {
      errors.displayOrder = 'Display order is required.';
    }
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        imageFilename,
        imageAlt: imageAlt.trim(),
        badge: badge.trim() || null,
        headline: headline.trim(),
        description: description.trim() || null,
        buttonText: buttonText.trim(),
        buttonLink: buttonLink.trim(),
        displayOrder: Number(displayOrder),
        active,
      });
    } catch (error) {
      setFieldErrors(error.fieldErrors ?? {});
      if (!error.fieldErrors) {
        setFormError(error.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div className="mb-4">
        <ImageUploader imageFileName={imageFilename} onChange={setImageFilename} />
        {fieldErrors.imageFilename && <p className="mt-1 text-sm text-red-600">{fieldErrors.imageFilename}</p>}
      </div>

      <div className="mb-4">
        <label htmlFor="imageAlt" className="mb-1 block text-sm font-medium text-slate-700">
          Image Alt Text
        </label>
        <input
          id="imageAlt"
          type="text"
          value={imageAlt}
          onChange={(event) => setImageAlt(event.target.value)}
          placeholder="e.g. Curated collection of trending gadgets and home products"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.imageAlt)}
          aria-describedby={fieldErrors.imageAlt ? 'imageAlt-error' : undefined}
        />
        {fieldErrors.imageAlt && (
          <p id="imageAlt-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.imageAlt}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="badge" className="mb-1 block text-sm font-medium text-slate-700">
          Badge (optional)
        </label>
        <input
          id="badge"
          type="text"
          value={badge}
          onChange={(event) => setBadge(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="headline" className="mb-1 block text-sm font-medium text-slate-700">
          Headline
        </label>
        <input
          id="headline"
          type="text"
          value={headline}
          onChange={(event) => setHeadline(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.headline)}
          aria-describedby={fieldErrors.headline ? 'headline-error' : undefined}
        />
        {fieldErrors.headline && (
          <p id="headline-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.headline}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
          Description (optional)
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="buttonText" className="mb-1 block text-sm font-medium text-slate-700">
          Button Text
        </label>
        <input
          id="buttonText"
          type="text"
          value={buttonText}
          onChange={(event) => setButtonText(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.buttonText)}
          aria-describedby={fieldErrors.buttonText ? 'buttonText-error' : undefined}
        />
        {fieldErrors.buttonText && (
          <p id="buttonText-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.buttonText}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="buttonLink" className="mb-1 block text-sm font-medium text-slate-700">
          Button Link
        </label>
        <input
          id="buttonLink"
          type="text"
          value={buttonLink}
          onChange={(event) => setButtonLink(event.target.value)}
          placeholder="e.g. /trending"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.buttonLink)}
          aria-describedby={fieldErrors.buttonLink ? 'buttonLink-error' : undefined}
        />
        {fieldErrors.buttonLink && (
          <p id="buttonLink-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.buttonLink}
          </p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="displayOrder" className="mb-1 block text-sm font-medium text-slate-700">
          Display Order
        </label>
        <input
          id="displayOrder"
          type="number"
          step="1"
          value={displayOrder}
          onChange={(event) => setDisplayOrder(event.target.value)}
          className="w-full max-w-[120px] rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.displayOrder)}
          aria-describedby={fieldErrors.displayOrder ? 'displayOrder-error' : undefined}
        />
        {fieldErrors.displayOrder && (
          <p id="displayOrder-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.displayOrder}
          </p>
        )}
      </div>

      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : banner ? 'Save Changes' : 'Add Slide'}
        </button>
      </div>
    </form>
  );
}

export default HeroBannerForm;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- HeroBannerForm.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/HeroBannerForm.jsx frontend/src/components/HeroBannerForm.test.jsx
git commit -m "feat: add HeroBannerForm"
```

---

### Task 8: Frontend — `HeroBannerManager` (admin section)

**Files:**
- Create: `frontend/src/components/HeroBannerManager.jsx`
- Test: `frontend/src/components/HeroBannerManager.test.jsx`

**Interfaces:**
- Consumes: `DataTable`, `Modal`, `ConfirmDialog`, `EmptyState`, `ErrorState` (existing), `HeroBannerForm` (Task 7), `adminHeroBannerService` (Task 3), `getImageUrl` (existing), `useToast` (existing).
- Produces: `HeroBannerManager()` (default export, no props — fully self-contained). Used inside `SettingsPage` (Task 9).

- [ ] **Step 1: Write the failing tests**

```jsx
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ToastProvider } from '../context/ToastContext.jsx';
import HeroBannerManager from './HeroBannerManager.jsx';
import * as adminHeroBannerService from '../services/adminHeroBannerService.js';
import * as adminImageService from '../services/adminImageService.js';

const banners = [
  {
    id: 1,
    imageFilename: 'img_1.webp',
    imageAlt: 'Trending gadgets',
    badge: 'Trending Today',
    headline: 'Amazon Finds Everyone Is Talking About',
    description: 'Discover trending products.',
    buttonText: 'Explore Trending Finds',
    buttonLink: '/trending',
    displayOrder: 1,
    active: true,
  },
];

function renderManager() {
  return render(
    <ToastProvider>
      <HeroBannerManager />
    </ToastProvider>
  );
}

describe('HeroBannerManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminHeroBannerService, 'getHeroBanners').mockResolvedValue(banners);
  });

  it('renders fetched hero banner slides', async () => {
    renderManager();

    expect(await screen.findByText('Amazon Finds Everyone Is Talking About')).toBeInTheDocument();
    expect(screen.getByText('Trending Today')).toBeInTheDocument();
  });

  it('shows an empty state when there are no slides', async () => {
    adminHeroBannerService.getHeroBanners.mockResolvedValue([]);
    renderManager();

    expect(await screen.findByText('No hero banner slides yet')).toBeInTheDocument();
  });

  it('creates a slide and shows a success toast', async () => {
    vi.spyOn(adminImageService, 'uploadImage').mockResolvedValue({ filename: 'img_2.webp' });
    vi.spyOn(adminHeroBannerService, 'createHeroBanner').mockResolvedValue({
      id: 2,
      imageFilename: 'img_2.webp',
      imageAlt: 'Category showcase',
      badge: null,
      headline: 'Find the Right Product Faster',
      description: null,
      buttonText: 'Browse Categories',
      buttonLink: '/categories',
      displayOrder: 2,
      active: true,
    });
    const user = userEvent.setup();
    renderManager();
    await screen.findByText('Amazon Finds Everyone Is Talking About');

    await user.click(screen.getByRole('button', { name: 'Add Slide' }));
    const dialog = screen.getByRole('dialog');

    const file = new File(['content'], 'photo.webp', { type: 'image/webp' });
    fireEvent.change(within(dialog).getByLabelText(/upload image/i), { target: { files: [file] } });
    await waitFor(() => expect(adminImageService.uploadImage).toHaveBeenCalled());

    await user.type(within(dialog).getByLabelText('Image Alt Text'), 'Category showcase');
    await user.type(within(dialog).getByLabelText('Headline'), 'Find the Right Product Faster');
    await user.type(within(dialog).getByLabelText('Button Text'), 'Browse Categories');
    await user.type(within(dialog).getByLabelText('Button Link'), '/categories');
    await user.click(within(dialog).getByRole('button', { name: 'Add Slide' }));

    expect(await screen.findByText('Find the Right Product Faster')).toBeInTheDocument();
    expect(await screen.findByText('Hero banner slide created successfully.')).toBeInTheDocument();
  });

  it('deletes a slide after confirmation with destructive styling and shows a success toast', async () => {
    vi.spyOn(adminHeroBannerService, 'deleteHeroBanner').mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderManager();
    await screen.findByText('Amazon Finds Everyone Is Talking About');

    await user.click(screen.getByRole('button', { name: /Delete Amazon Finds Everyone Is Talking About/i }));
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    expect(confirmButton).toHaveClass('bg-red-600');
    await user.click(confirmButton);

    await waitFor(() => expect(adminHeroBannerService.deleteHeroBanner).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Hero banner slide deleted successfully.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- HeroBannerManager.test.jsx`
Expected: FAIL — `HeroBannerManager.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import DataTable from './DataTable.jsx';
import Modal from './Modal.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import HeroBannerForm from './HeroBannerForm.jsx';
import EmptyState from './EmptyState.jsx';
import ErrorState from './ErrorState.jsx';
import { useToast } from '../hooks/useToast.js';
import { getImageUrl } from '../utils/imageUrl.js';
import {
  getHeroBanners,
  createHeroBanner,
  updateHeroBanner,
  deleteHeroBanner,
} from '../services/adminHeroBannerService.js';

function HeroBannerManager() {
  const { showToast } = useToast();
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalState, setModalState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function load() {
    setIsLoading(true);
    setError(null);
    getHeroBanners()
      .then(setBanners)
      .catch((err) => setError(err.message ?? 'Failed to load hero banner slides.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    // load() resets loading/error state synchronously before fetching; this is the
    // standard reset-before-async-work pattern and can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleFormSubmit(payload) {
    if (modalState.banner) {
      const updated = await updateHeroBanner(modalState.banner.id, payload);
      setBanners((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      showToast('Hero banner slide updated successfully.');
    } else {
      const created = await createHeroBanner(payload);
      setBanners((current) => [...current, created]);
      showToast('Hero banner slide created successfully.');
    }
    setModalState(null);
  }

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      await deleteHeroBanner(deleteTarget.id);
      setBanners((current) => current.filter((item) => item.id !== deleteTarget.id));
      showToast('Hero banner slide deleted successfully.');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message ?? 'Failed to delete hero banner slide.', 'error');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  const columns = [
    {
      key: 'imageFilename',
      label: 'Image',
      render: (row) => {
        const url = getImageUrl(row.imageFilename);
        return url ? <img src={url} alt={row.imageAlt} className="h-12 w-20 rounded-md object-cover" /> : null;
      },
    },
    { key: 'headline', label: 'Headline' },
    { key: 'badge', label: 'Badge', render: (row) => row.badge || '—' },
    { key: 'displayOrder', label: 'Order' },
    {
      key: 'active',
      label: 'Status',
      render: (row) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {row.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModalState({ banner: row })}
            aria-label={`Edit ${row.headline}`}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.headline}`}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Hero Banner Slides</h3>
          <p className="mt-1 text-sm text-slate-500">
            When at least one active slide exists, the homepage shows a carousel instead of the single hero image
            above.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalState({ banner: null })}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Slide
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <DataTable
          columns={columns}
          rows={banners}
          onSortChange={() => {}}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              title="No hero banner slides yet"
              description="Add your first slide, or leave this empty to show the default hero image above."
            />
          }
        />
      )}

      {modalState && (
        <Modal
          isOpen
          onClose={() => setModalState(null)}
          title={modalState.banner ? 'Edit Hero Banner Slide' : 'Add Hero Banner Slide'}
        >
          <HeroBannerForm banner={modalState.banner} onSubmit={handleFormSubmit} onCancel={() => setModalState(null)} />
        </Modal>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Hero Banner Slide"
        message={
          deleteTarget
            ? `Are you sure you want to delete the "${deleteTarget.headline}" slide? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default HeroBannerManager;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- HeroBannerManager.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/HeroBannerManager.jsx frontend/src/components/HeroBannerManager.test.jsx
git commit -m "feat: add HeroBannerManager admin section"
```

---

### Task 9: Frontend — Wire `HeroBannerManager` into `SettingsPage`

**Files:**
- Modify: `frontend/src/pages/admin/SettingsPage.jsx`
- Modify: `frontend/src/pages/admin/SettingsPage.test.jsx`

**Interfaces:**
- Consumes: `HeroBannerManager` from Task 8 (no props).
- Produces: nothing new downstream — this task only wires an existing component into an existing page.

- [ ] **Step 1: Write the failing test**

Add this test to the existing `describe('SettingsPage', ...)` block in `frontend/src/pages/admin/SettingsPage.test.jsx` (the file already mocks `adminSettingsService.getSettings` in `beforeEach` — add a mock for `adminHeroBannerService.getHeroBanners` alongside it):

```jsx
// Add this import at the top of the file, alongside the existing service imports:
import * as adminHeroBannerService from '../../services/adminHeroBannerService.js';

// Add this line inside the existing beforeEach(), alongside the other mocks:
vi.spyOn(adminHeroBannerService, 'getHeroBanners').mockResolvedValue([]);

// Add this test inside the existing describe('SettingsPage', ...) block:
it('renders the Hero Banner Slides section', async () => {
  renderPage();
  await screen.findByLabelText('Hero Headline');

  expect(await screen.findByText('Hero Banner Slides')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- SettingsPage.test.jsx`
Expected: FAIL — `HeroBannerManager` is not rendered by the current `SettingsPage`.

- [ ] **Step 3: Modify `SettingsPage.jsx`**

Add the import:
```javascript
import HeroBannerManager from '../../components/HeroBannerManager.jsx';
```

Add a one-line note under the existing Hero Image `ImageUploader`, and a new section for `HeroBannerManager` directly after the "Branding & Hero Images" `<section>`. The relevant part of the JSX currently reads:

```jsx
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Hero Image</span>
              <ImageUploader
                imageFileName={settings.heroImageFilename}
                onChange={(filename) => handleChange('heroImageFilename', filename)}
              />
            </div>
```

Change it to:

```jsx
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Hero Image</span>
              <ImageUploader
                imageFileName={settings.heroImageFilename}
                onChange={(filename) => handleChange('heroImageFilename', filename)}
              />
              <p className="mt-1 text-sm text-slate-500">
                This image is used only when no hero banner slides are configured below.
              </p>
            </div>
```

Then, immediately after the "Branding & Hero Images" `</section>` closing tag and before the "Hero Content" `<section>`, add:

```jsx
        <section>
          <HeroBannerManager />
        </section>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- SettingsPage.test.jsx`
Expected: PASS (10 tests — the 9 existing plus the new one)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/admin/SettingsPage.jsx frontend/src/pages/admin/SettingsPage.test.jsx
git commit -m "feat: wire HeroBannerManager into the System Settings page"
```

---

### Task 10: Frontend — Wire `HeroCarousel` into `HomePage`

**Files:**
- Modify: `frontend/src/pages/HomePage.jsx`
- Modify: `frontend/src/pages/HomePage.test.jsx`

**Interfaces:**
- Consumes: `HeroCarousel` from Task 6, `heroBannerService.getHeroBanners()` from Task 4.
- Produces: nothing new downstream — this is the final integration point for the whole feature.

- [ ] **Step 1: Write the failing test**

Add these to `frontend/src/pages/HomePage.test.jsx` (the file already mocks `settingsService`/`categoryService`/`productService`/`trackingService` in `beforeEach` — add a mock for `heroBannerService.getHeroBanners` alongside them):

```jsx
// Add this import at the top of the file, alongside the existing service imports:
import * as heroBannerService from '../services/heroBannerService.js';

// Add this line inside the existing beforeEach(), alongside the other mocks:
vi.spyOn(heroBannerService, 'getHeroBanners').mockResolvedValue([]);

// Add these tests inside the existing describe('HomePage', ...) block:
it('renders the default HeroSection when there are no hero banners', async () => {
  renderHomePage();
  expect(await screen.findByRole('heading', { name: settings.heroHeadline })).toBeInTheDocument();
});

it('renders the hero carousel when hero banners are configured', async () => {
  heroBannerService.getHeroBanners.mockResolvedValue([
    {
      id: 1,
      imageFilename: 'img_1.webp',
      imageAlt: 'Trending gadgets',
      badge: 'Trending Today',
      headline: 'Amazon Finds Everyone Is Talking About',
      description: 'Discover trending products.',
      buttonText: 'Explore Trending Finds',
      buttonLink: '/trending',
    },
  ]);
  renderHomePage();

  expect(await screen.findByRole('heading', { name: 'Amazon Finds Everyone Is Talking About' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- HomePage.test.jsx`
Expected: FAIL — `HomePage` doesn't fetch hero banners or render `HeroCarousel` yet.

- [ ] **Step 3: Modify `HomePage.jsx`**

Add the imports:
```javascript
import HeroCarousel from '../components/HeroCarousel.jsx';
import { getHeroBanners } from '../services/heroBannerService.js';
```
(Remove the now-unused `HeroSection` import — `HeroCarousel` imports it directly.)

Add hero banner state and fetch, alongside the existing settings/categories effect:
```jsx
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [heroBanners, setHeroBanners] = useState([]);
  const productSearch = useProductSearch();
```
```jsx
  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
    getHeroBanners()
      .then(setHeroBanners)
      .catch(() => setHeroBanners([]));
  }, []);
```

Replace the `<HeroSection ... />` usage:
```jsx
      <HeroSection
        headline={settings?.heroHeadline ?? 'Smart Finds. Better Buys. All in One Place.'}
        description={
          settings?.heroDescription ??
          'Discover trending Amazon products, everyday essentials, affordable finds, and must-have items carefully selected to help you shop smarter.'
        }
        onExploreClick={scrollToCatalog}
        onTrendingClick={() => {
          productSearch.setFilter('trending');
          scrollToCatalog();
        }}
      />
```
with:
```jsx
      <HeroCarousel
        banners={heroBanners}
        heroSectionProps={{
          headline: settings?.heroHeadline ?? 'Smart Finds. Better Buys. All in One Place.',
          description:
            settings?.heroDescription ??
            'Discover trending Amazon products, everyday essentials, affordable finds, and must-have items carefully selected to help you shop smarter.',
          onExploreClick: scrollToCatalog,
          onTrendingClick: () => {
            productSearch.setFilter('trending');
            scrollToCatalog();
          },
        }}
      />
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- HomePage.test.jsx`
Expected: PASS (7 tests — the 5 existing plus the 2 new ones)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/HomePage.jsx frontend/src/pages/HomePage.test.jsx
git commit -m "feat: wire HeroCarousel into the public homepage"
```

---

### Task 11: Final verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1–10
- Produces: nothing further downstream — this feature's final gate.

- [ ] **Step 1: Run the entire backend test suite**

Run: `cd backend && mvn test`
Expected: PASS — every prior backend test plus `AdminHeroBannerControllerTest` and `PublicHeroBannerControllerTest`.

- [ ] **Step 2: Run the entire frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior frontend test plus all tests from Tasks 3 through 10.

- [ ] **Step 3: Run frontend lint**

Run: `cd frontend && npm run lint`
Expected: clean (0 errors, 0 warnings). `HeroBannerManager`'s `load()` effect follows the same `react-hooks/set-state-in-effect` pattern as `CategoriesPage`/`ProductsPage` — the disable comment is already included. Per the System Settings stage's lesson, do not add an `exhaustive-deps` disable unless lint actually flags one.

- [ ] **Step 4: Run the frontend production build**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 5: Manual smoke check (optional, requires the backend running and a real admin login)**

Optional — skip if a live backend isn't available; Steps 1-4 are the mandatory bar. If available: confirm the homepage shows the default `HeroSection` with zero banners configured; add a hero banner slide via `/admin/settings`; confirm the homepage now shows a single chrome-less slide; add a second slide; confirm the homepage now shows full carousel chrome (autoplay, arrows, indicators) and that each slide's button navigates to its configured internal route; delete a slide and confirm it disappears from both the admin table and the public carousel.

- [ ] **Step 6: Commit (if the smoke check surfaced any fixes)**

If Step 5 found nothing to fix (or was skipped), there is nothing to commit for this task — Task 10's commit is the final commit of this feature. If it did surface a small fix, apply it, re-run Steps 1-4, and commit:
```bash
git add -A
git commit -m "fix: address issue found during Hero Banners manual smoke check"
```
