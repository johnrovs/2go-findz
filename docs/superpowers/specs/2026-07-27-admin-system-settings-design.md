# Frontend Admin Stage 3: System Settings — Design

**Date:** 2026-07-27
**Scope:** Third of four sequential Frontend Admin sub-stages (Category Management → Product Management → **System Settings** → Dashboard & Analytics). Replaces the `SettingsPage` placeholder with a single-record settings form covering branding/hero images, hero content, social links, and shop info/disclosure.

**Master spec:** `docs/PROJECT_SPEC.md` §"6. System Settings". **Depends on:** `ImageUploader` (Product Management stage, `frontend/src/components/ImageUploader.jsx`) reused as-is, three times. Backend endpoints consumed, JWT-protected:

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/settings` | → `SettingsResponse`, no id — a singleton record |
| PUT | `/api/admin/settings` | body `SettingsRequest` (the full record) → `SettingsResponse` |

`SettingsRequest`/`SettingsResponse` (verified directly from the backend DTOs, not summarized): `{ logoImageFilename, heroImageFilename, placeholderImageFilename, tiktokUrl, pinterestUrl, instagramUrl, youtubeUrl, shopBio, heroHeadline, heroDescription, affiliateDisclosure, contactEmail }`. Only `affiliateDisclosure` is `@NotBlank` (required); `contactEmail` is `@Email`-validated only when non-empty; every other field — including all three image filenames and all four social URLs — has no server-side required-ness at all. This is a different validation posture than `ProductForm`/`CategoryForm`, where several fields are mandatory.

## Out of scope for this stage

- Dashboard & Analytics (the next sub-stage)
- Any backend changes
- Per-field/partial save — the backend only exposes one `PUT` for the entire record, so the form always round-trips the full object

## Page (`SettingsPage`)

No separate list/detail split — settings is a singleton, so one page handles load + edit + save. On mount, `getSettings()` populates the form; `isLoading`/error states use the existing `LoadingSpinner`/`ErrorState` (with retry) pattern. Submitting calls `updateSettings(payload)` with the complete current form state (every field, edited or not — there is no partial-patch semantics on the backend) and, on success, re-syncs local state from the response and shows a success toast via the existing `useToast()`.

**Form sections, in order:**
1. **Branding & Hero Images** — three `ImageUploader` instances (logo, hero image, placeholder image), each wired to its own `imageFileName`/`onChange` pair, identical usage pattern to `ProductForm`.
2. **Hero Content** — hero headline (text input), hero description (textarea).
3. **Social Links** — TikTok, Pinterest, Instagram, YouTube URLs (plain text inputs; no format validation beyond what the backend enforces, which is none — these are un-annotated `String` fields).
4. **Shop Info & Disclosure** — shop bio (textarea), affiliate disclosure (textarea, **required**), contact email (text input, validated as an email format only when non-empty, mirroring `@Email`'s actual behavior).

One "Save Changes" button at the bottom of the whole form — no per-section save, since the backend has no partial-update endpoint.

## Validation

Client-side mirrors the backend precisely: only `affiliateDisclosure` is required (non-empty after trim). `contactEmail`, if non-empty, must match a basic email pattern (`^[^\s@]+@[^\s@]+\.[^\s@]+$`) — validated only when the field has content, never required. No other field is validated beyond being sent as-is (empty string or `null`, whichever the field currently holds, both acceptable since none of the other fields have backend constraints). Server-side field errors (the `{ message, fieldErrors }` shape) render inline under the matching field, same pattern as `CategoryForm`/`ProductForm`.

## New service

`frontend/src/services/adminSettingsService.js` — `getSettings(): Promise<Settings>`, `updateSettings(payload): Promise<Settings>`. Distinct from the existing public `frontend/src/services/settingsService.js` (which reads `GET /public/settings` and is unrelated — different endpoint, different consumer).

## Data flow & error handling

- **Load:** `getSettings()` on mount; a failed fetch shows `ErrorState` with retry (re-triggers the same load).
- **Save:** `updateSettings(payload)` with the full current form state; on success, re-sync local state from the response (in case the backend normalizes anything) and show a success toast. On a validation error, the relevant field(s) show inline errors and the form stays populated with the user's entered data — nothing is lost or reset.
- **Image uploads:** each `ImageUploader` behaves exactly as in Product Management — uploads immediately on file selection, updates the corresponding `imageFileName` in local form state on success, shows its own inline error on failure without affecting the rest of the form.

## Accessibility

Same bar as prior stages: labeled inputs, `aria-invalid`/`aria-describedby` on validation errors, section headings as real `<h2>`s for screen-reader navigation between the four groups.

## Testing

Vitest + React Testing Library:
- `adminSettingsService`: request/response shape, mirroring the `adminCategoryService`/`adminProductService` test pattern (`vi.spyOn(api, ...)`).
- `SettingsPage`: loads and pre-fills existing settings; validates the required affiliate disclosure and the conditional email format; submits the full payload including fields the user never touched; uploading an image in any of the three uploaders includes the returned filename in the next submit payload; shows a success toast and stays on the page after saving; renders a server-side field error inline; shows `ErrorState` with working retry when the initial load fails.
