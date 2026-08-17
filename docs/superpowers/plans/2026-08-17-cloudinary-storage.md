# Cloudinary Storage for Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the pre-deployment audit's Critical/High finding — uploaded images are lost on every Railway redeploy — by adding a `CloudinaryStorageService` active only under the `prod` Spring profile, while local development and the test suite keep using local disk with zero external dependency.

**Architecture:** `StorageService`'s existing two-method interface (`store`/`delete`) is untouched. `LocalStorageService` becomes `@Profile("!prod")`-scoped; a new `CloudinaryStorageService` is `@Profile("prod")`-scoped. `AdminImageController` and every entity that stores the returned value need zero changes — `CloudinaryStorageService.store()` returns a full `secure_url` string in the same field `UploadResponse.filename` already uses. The frontend's single `getImageUrl()` utility gets one backward-compatible early-return for full-URL values.

**Tech Stack:** Spring Boot 3.2.5, `com.cloudinary:cloudinary-http5:2.4.0` (verified current on Maven Central, not from memory), JUnit 5 + AssertJ, Vitest.

## Global Constraints

- `StorageService`'s interface (`store(MultipartFile): String`, `delete(String): void`) does not change. Neither does `AdminImageController`, `UploadResponse`, or any entity/DTO field name that stores an image reference.
- One new env var: `CLOUDINARY_URL` (Cloudinary's own native connection-string format, e.g. `cloudinary://<api_key>:<api_secret>@<cloud_name>`). No separate cloud-name/key/secret variables.
- `LocalStorageService` must remain fully functional and be the only active `StorageService` bean for the `dev` profile (and therefore the test suite, which runs with no `@ActiveProfiles` override and thus the `dev` default) — the full existing backend test suite must keep passing unmodified.
- Do not build any migration script for existing local-disk images. Do not touch `WebMvcConfig`'s `/uploads/**` mapping — it keeps serving old local files exactly as today.

---

### Task 1: `CloudinaryStorageService`, profile-scoped alongside `LocalStorageService`

**Files:**
- Modify: `backend/pom.xml`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/LocalStorageService.java`
- Modify: `backend/src/main/resources/application.yml`
- Modify: `backend/.env.example`
- Create: `backend/src/main/java/com/twogofindz/backend/service/impl/CloudinaryStorageService.java`
- Test: `backend/src/test/java/com/twogofindz/backend/service/impl/CloudinaryStorageServiceTest.java`

**Interfaces:**
- Consumes: `StorageService` (existing, unmodified — `store(MultipartFile): String`, `delete(String): void`).
- Produces: `CloudinaryStorageService`, a second `StorageService` implementation active only under the `prod` profile. Package-private method `String extractPublicId(String secureUrl)` (returns the Cloudinary `public_id`, or `null` if the input doesn't look like a Cloudinary URL) — used internally by `delete()`, and directly by this task's own test.

- [ ] **Step 1: Write the failing test for `extractPublicId`**

Create `backend/src/test/java/com/twogofindz/backend/service/impl/CloudinaryStorageServiceTest.java`:

```java
package com.twogofindz.backend.service.impl;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CloudinaryStorageServiceTest {

    private final CloudinaryStorageService service = new CloudinaryStorageService("cloudinary://key:secret@demo");

    @Test
    void extractPublicId_returnsFolderPrefixedId_forAFolderedUpload() {
        String url = "https://res.cloudinary.com/demo/image/upload/v1699999999/2go-findz/abc123.jpg";
        assertThat(service.extractPublicId(url)).isEqualTo("2go-findz/abc123");
    }

    @Test
    void extractPublicId_returnsPlainId_whenThereIsNoFolder() {
        String url = "https://res.cloudinary.com/demo/image/upload/v1699999999/abc123.png";
        assertThat(service.extractPublicId(url)).isEqualTo("abc123");
    }

    @Test
    void extractPublicId_returnsNull_forANonCloudinaryUrl() {
        assertThat(service.extractPublicId("img_20260726_120000_001.jpg")).isNull();
    }
}
```

This test constructs a real `CloudinaryStorageService` with a fake (but correctly-shaped) `cloudinary://` URL. `new Cloudinary(String)` only parses the connection string locally — it makes no network call — so this is safe to run with no real credentials, in every environment including CI.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && mvn test -Dtest=CloudinaryStorageServiceTest`
Expected: FAIL — `CloudinaryStorageService` does not exist yet (compilation failure).

- [ ] **Step 3: Add the Cloudinary dependency**

In `backend/pom.xml`, add this dependency directly after the existing `spring-boot-starter-security` dependency block:

```xml
    <dependency>
      <groupId>com.cloudinary</groupId>
      <artifactId>cloudinary-http5</artifactId>
      <version>2.4.0</version>
    </dependency>
```

- [ ] **Step 4: Scope `LocalStorageService` to the non-prod profile**

In `backend/src/main/java/com/twogofindz/backend/service/impl/LocalStorageService.java`, add the import and annotation:

```java
import org.springframework.context.annotation.Profile;
```

```java
@Service
@Profile("!prod")
public class LocalStorageService implements StorageService {
```

(currently just `@Service` — add `@Profile("!prod")` directly above/alongside it). No other line in this file changes.

- [ ] **Step 5: Add the Cloudinary URL property**

In `backend/src/main/resources/application.yml`, add directly after the existing `app.upload.directory` line:

```yaml
  upload:
    directory: ${UPLOAD_DIRECTORY:uploads}
  cloudinary:
    url: ${CLOUDINARY_URL:}
```

(The `app.upload.directory` line already exists — this just adds the two new `cloudinary.url` lines as a sibling under `app:`, matching the file's existing indentation.)

- [ ] **Step 6: Implement `CloudinaryStorageService`**

Create `backend/src/main/java/com/twogofindz/backend/service/impl/CloudinaryStorageService.java`:

```java
package com.twogofindz.backend.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.twogofindz.backend.exception.InvalidFileException;
import com.twogofindz.backend.service.StorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Profile("prod")
public class CloudinaryStorageService implements StorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    private static final Pattern PUBLIC_ID_PATTERN = Pattern.compile("/v\\d+/(.+)\\.[a-zA-Z0-9]+$");

    private final Cloudinary cloudinary;

    public CloudinaryStorageService(@Value("${app.cloudinary.url}") String cloudinaryUrl) {
        this.cloudinary = new Cloudinary(cloudinaryUrl);
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

        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap("folder", "2go-findz", "resource_type", "image"));
            return (String) result.get("secure_url");
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to upload file to Cloudinary.", e);
        }
    }

    @Override
    public void delete(String storedValue) {
        if (storedValue == null || storedValue.isBlank()) {
            return;
        }
        String publicId = extractPublicId(storedValue);
        if (publicId == null) {
            return;
        }
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to delete file from Cloudinary: " + storedValue, e);
        }
    }

    String extractPublicId(String secureUrl) {
        Matcher matcher = PUBLIC_ID_PATTERN.matcher(secureUrl);
        return matcher.find() ? matcher.group(1) : null;
    }
}
```

- [ ] **Step 7: Document the new env var**

In `backend/.env.example`, add a new line directly after the existing `UPLOAD_DIRECTORY=uploads` line:

```
UPLOAD_DIRECTORY=uploads
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd backend && mvn test -Dtest=CloudinaryStorageServiceTest`
Expected: PASS (3 tests)

- [ ] **Step 9: Run the full backend suite**

Run: `cd backend && export DOCKER_HOST=unix:///Users/johnrovero/.colima/default/docker.sock && export TESTCONTAINERS_RYUK_DISABLED=true && mvn clean package`
Expected: `BUILD SUCCESS`, all existing tests pass unmodified (the `dev`-profile default keeps `LocalStorageService` active for every existing test, including `AdminImageControllerTest`) — confirms `@Profile("!prod")` didn't break anything and the app still starts correctly with exactly one `StorageService` bean active.

- [ ] **Step 10: Commit**

```bash
git add backend/pom.xml backend/src/main/java/com/twogofindz/backend/service/impl/LocalStorageService.java backend/src/main/java/com/twogofindz/backend/service/impl/CloudinaryStorageService.java backend/src/main/resources/application.yml backend/.env.example backend/src/test/java/com/twogofindz/backend/service/impl/CloudinaryStorageServiceTest.java
git commit -m "feat(storage): add CloudinaryStorageService for the prod profile"
```

---

### Task 2: Frontend `getImageUrl` — recognize full Cloudinary URLs

**Files:**
- Modify: `frontend/src/utils/imageUrl.js`
- Modify: `frontend/src/utils/imageUrl.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `getImageUrl(filename)` — unchanged signature and unchanged behavior for bare filenames; new behavior: a value that already looks like a full URL is returned as-is.

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/utils/imageUrl.test.js`, directly after the existing `'handles a production-style base URL'` test:

```jsx
  it('returns a Cloudinary URL unchanged instead of prepending the backend origin', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080/api');
    const cloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/v1699999999/2go-findz/abc123.jpg';
    expect(getImageUrl(cloudinaryUrl)).toBe(cloudinaryUrl);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/imageUrl.test.js`
Expected: FAIL — the current implementation prepends the backend origin to every non-empty input, so the returned value would be `http://localhost:8080https://res.cloudinary.com/...`, not the plain Cloudinary URL.

- [ ] **Step 3: Add the early return**

In `frontend/src/utils/imageUrl.js`, change:

```js
export function getImageUrl(filename) {
  if (!filename) return null;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
  const origin = apiBaseUrl.replace(/\/api\/?$/, '');
  return `${origin}/uploads/${filename}`;
}
```

to:

```js
export function getImageUrl(filename) {
  if (!filename) return null;
  if (/^https?:\/\//.test(filename)) return filename;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
  const origin = apiBaseUrl.replace(/\/api\/?$/, '');
  return `${origin}/uploads/${filename}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/imageUrl.test.js`
Expected: PASS (4 tests — the 3 existing ones plus the new one, all unmodified except the new addition)

- [ ] **Step 5: Run the full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: same pass count as the pre-existing baseline, plus the one new test (5 known pre-existing failures unrelated to this feature: 4 `DashboardHeader.test.jsx` were already fixed in the audit session — only the account-menu-dropdown test remains failing, and it's unrelated to this change).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/imageUrl.js frontend/src/utils/imageUrl.test.js
git commit -m "feat(storage): recognize full Cloudinary URLs in getImageUrl"
```

---

## Definition of Done

- `mvn clean package` (from `backend/`) passes in full, including the 3 new `CloudinaryStorageServiceTest` tests.
- `npx vitest run` (from `frontend/`) passes in full, including the 1 new `imageUrl.test.js` test.
- Manual verification, **after** the user has set `CLOUDINARY_URL` and `SPRING_PROFILES_ACTIVE=prod` in Railway (cannot be done locally without real credentials):
  1. Upload a product image through the admin UI on the deployed app.
  2. Confirm the image displays (proves `secure_url` round-trips correctly through `getImageUrl`).
  3. Redeploy the Railway service.
  4. Confirm the previously-uploaded image still displays — the actual bug this fixes.
