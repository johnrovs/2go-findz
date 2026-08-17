# Cloudinary Storage for Production — Design Spec

## Goal

Fix the Critical/High deployment blocker identified in the pre-deployment audit: uploaded images are stored on local disk (`backend/uploads/`) and served via `/uploads/**`, which is lost on every Railway redeploy (ephemeral container filesystem). Add a `CloudinaryStorageService` used only in production, while local development and the test suite keep using local disk with zero external dependency. `StorageService`'s existing two-method interface (`store`/`delete`) is not touched — this is a drop-in implementation swap, not an architecture change.

## Context (read directly from source before writing this spec)

- `StorageService` (`store(MultipartFile): String`, `delete(String): void`) has **exactly one caller**: `AdminImageController` (`POST /api/admin/images`), which returns the stored value as `UploadResponse.filename` to the frontend. No other backend code calls `StorageService` directly.
- Every entity that references an image (products, categories, buying guides, etc.) just stores whatever opaque string `store()` returned in a `*ImageFilename`/`*Filename`-style column — none of them know or care what the string actually is.
- The frontend has exactly one place that turns that stored string into a displayable URL: `frontend/src/utils/imageUrl.js`'s `getImageUrl(filename)`, which today unconditionally builds `${backendOrigin}/uploads/${filename}`.
- `application.yml` already resolves `spring.profiles.active` from `${SPRING_PROFILES_ACTIVE:dev}`; `application-dev.yml` and `application-prod.yml` already exist and are used for profile-specific overrides. The backend test suite (`AbstractIntegrationTest`, no `@ActiveProfiles` override) runs with the `dev` default.

## Conflicts / decisions resolved with the user before implementation

- **Credentials**: the user will create/retrieve real Cloudinary API credentials and set them as a Railway environment variable. Not requested or seen by this session.
- **Dev/test behavior**: `LocalStorageService` stays as-is and remains active for local development and the full test suite (`@Profile("!prod")`). A new `CloudinaryStorageService` is only active when the `prod` Spring profile is active (`@Profile("prod")`). No new `app.storage.provider`-style config property — this reuses the profile mechanism the app already has.
- **Existing local images**: left untouched. `/uploads/**` keeps being served from local disk (`WebMvcConfig` unchanged) so any already-stored local filenames keep resolving. This does not retroactively protect old images from being lost on Railway (they're already at risk today, per the audit) — it just avoids breaking them today and avoids a data-touching migration script in this change. No migration script is part of this spec.
- **Config shape**: one new env var, `CLOUDINARY_URL`, using Cloudinary's own native connection-string format (`cloudinary://<api_key>:<api_secret>@<cloud_name>`) — this is what Cloudinary's dashboard hands you directly to copy-paste, and it's one secret instead of three.
- **`UploadResponse.filename` field name is not renamed.** It will sometimes hold a bare local filename (dev) and sometimes a full Cloudinary URL (prod) — same field, same JSON key, on purpose. Renaming it would ripple into `AdminImageControllerTest` assertions and any other consumer for zero functional benefit. This spec explicitly calls this out so it isn't "fixed" unprompted during implementation.

## Verified dependency

`com.cloudinary:cloudinary-http5:2.4.0` — confirmed as the current version on Maven Central directly (not from training-data memory) before writing this spec. This is Cloudinary's official Java SDK package for general (non-Android) Java applications, built on Apache HttpClient 5.

## Backend changes

### 1. `pom.xml`

Add:
```xml
<dependency>
  <groupId>com.cloudinary</groupId>
  <artifactId>cloudinary-http5</artifactId>
  <version>2.4.0</version>
</dependency>
```

### 2. `LocalStorageService.java`

Add `@Profile("!prod")` to the class. No other change — same file, same behavior, same tests.

### 3. New: `CloudinaryStorageService.java` (`service/impl/`)

Implements `StorageService`. Constructed with a `Cloudinary` client built from the `CLOUDINARY_URL` env var (`@Value("${app.cloudinary.url}")`, itself mapped from `${CLOUDINARY_URL}` in `application.yml`, matching how every other secret in this app is wired). Annotated `@Profile("prod")`.

- `store(MultipartFile file)`: validates exactly like `LocalStorageService` does today (empty check, 5MB max, `image/jpeg|png|webp` content-type allowlist) — **this validation logic is duplicated, not shared**, because extracting a common base class/helper for two ~10-line checks is not worth the indirection for a two-implementation interface; matches "don't add abstractions beyond what the task requires." Then calls `cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap("folder", "2go-findz", "resource_type", "image"))` and returns the response map's `"secure_url"` entry (a full HTTPS URL) — **not** the `public_id`, so the frontend never needs any Cloudinary-specific knowledge.
- `delete(String storedValue)`: no-ops (matching `LocalStorageService.delete()`'s own no-op-if-blank guard) if `storedValue` is null/blank, or **is not a Cloudinary URL** (i.e. it's an old local filename — nothing to delete from Cloudinary). Otherwise extracts the `public_id` from the URL's own structure and calls `cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap())`.

  **Extraction detail, spelled out precisely because it's easy to get subtly wrong**: since `store()` uploads with `"folder": "2go-findz"`, the resulting `public_id` is itself `2go-findz/<generated-id>` — the folder is embedded as a literal `/` inside the public_id, it is not a separate path segment you can discard. A Cloudinary `secure_url` looks like `https://res.cloudinary.com/<cloud>/image/upload/v<digits>/2go-findz/<generated-id>.<ext>`. The correct extraction is "everything after the `/v<digits>/` segment, minus the final `.<ext>`" — e.g. `Pattern.compile("/v\\d+/(.+)\\.[a-zA-Z0-9]+$")` matched against the URL, taking capture group 1. A naive "take the last `/`-separated path segment" implementation would silently drop the `2go-findz/` prefix, pass the wrong `public_id` to `destroy()`, and Cloudinary would report success while deleting nothing (an unmatched `public_id` is not an error from `destroy()`'s perspective).

### 4. `application.yml`

Add alongside the existing `app.upload.directory` property:
```yaml
app:
  cloudinary:
    url: ${CLOUDINARY_URL:}
```
Empty-string default so the `dev`/test profile (where `CloudinaryStorageService` isn't even instantiated, per its `@Profile("prod")`) never needs this variable set.

## Frontend changes

### `frontend/src/utils/imageUrl.js`

```js
export function getImageUrl(filename) {
  if (!filename) return null;
  if (/^https?:\/\//.test(filename)) return filename;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
  const origin = apiBaseUrl.replace(/\/api\/?$/, '');
  return `${origin}/uploads/${filename}`;
}
```
One added early-return: if the stored value already looks like a full URL, return it verbatim (this is the Cloudinary case). Every existing behavior for bare filenames is completely unchanged — the three existing tests in `imageUrl.test.js` keep passing unmodified.

## Testing plan

**Backend**: `CloudinaryStorageServiceTest.java` — a plain unit test (no Spring context, no Testcontainers, matching `ProductImportValidatorTest`'s style for a class with no framework dependencies beyond what's injected via constructor) that verifies the public_id-extraction logic against realistic Cloudinary URL shapes — **specifically including the folder-prefixed shape this app actually produces** (`.../upload/v1699999999/2go-findz/abc123.jpg` → `2go-findz/abc123`, not just `abc123`), since that's the real case, not a hypothetical one. `Cloudinary`/`Uploader` calls themselves aren't mocked/tested here since that's Cloudinary's own SDK, not this app's logic; the app's only real logic is the validation (already covered by `LocalStorageService`'s existing test coverage pattern via `AdminImageControllerTest`, which this spec does not duplicate for the Cloudinary path since it never runs in the `dev`-profile test suite) and the URL-parsing for delete.

**Frontend**: extend `imageUrl.test.js` with one new test — a Cloudinary-style `https://res.cloudinary.com/...` input returns unchanged, verifying the new early-return without touching any existing assertion.

## Manual verification (post-deploy, cannot be done locally without real credentials)

1. Set `CLOUDINARY_URL` and `SPRING_PROFILES_ACTIVE=prod` in Railway.
2. Upload a product image through the admin UI on the deployed app.
3. Confirm the image displays (proves `secure_url` round-trips correctly through `getImageUrl`).
4. Redeploy the Railway service.
5. Confirm the previously-uploaded image still displays (proves it survived the redeploy — the actual bug this fixes).
