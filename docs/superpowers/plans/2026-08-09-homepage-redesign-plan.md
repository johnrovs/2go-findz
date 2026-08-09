# Public Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the public homepage to match the supplied reference (dark navy header/footer, split hero with trust cards, social strip, carousel-driven Featured Products, two-column Trending/Best Sellers, category grid, promo banner, 5-column footer) while preserving every real route, data source, and behavior the site already has.

**Architecture:** New homepage-only components live in `frontend/src/components/home/`. The dark `Navbar`/`PublicFooter` restyle applies site-wide (confirmed), reusing the existing shared `CatalogPage.jsx` wrapper for the new `/products` catalog route instead of duplicating its markup. One small additive backend change (`facebookUrl` on `SystemSettings`) mirrors four existing URL fields exactly.

**Tech Stack:** React 18.3, Vite, Tailwind CSS, Framer Motion, React Router, Vitest + React Testing Library (frontend); Spring Boot, JPA/Flyway, JUnit + MockMvc + Testcontainers (backend).

## Global Constraints

- No new npm dependencies — the carousel is CSS `scroll-snap` + a small amount of JS, not a library (spec requirement).
- Do not display ratings, prices, or descriptions on homepage product cards (spec requirement) — only image + name.
- Every new external/placeholder asset must be honestly labeled; no fabricated data, fake success states, or dead links.
- Hero placeholder image is referenced via exactly one named constant (`HOME_HERO_IMAGE`) with the exact required comment above it.
- Preserve all existing routes, auth, search infra reuse, analytics (`recordView`/`recordClick`), and API integrations.
- Every new component gets a co-located `.test.jsx`. Every modified component's test file is updated in the same task.
- Follow existing conventions exactly: `text-{size}` + `text-{colorName}` Tailwind class pairing (e.g. `text-small text-body`), `getImageUrl()` for images, `recordClick(productId, sessionId)` best-effort (`.catch` swallowed) tracking, `MemoryRouter`-wrapped RTL tests, `vi.spyOn` service mocking with `beforeEach(() => vi.restoreAllMocks())`.
- Design doc: `docs/superpowers/specs/2026-08-09-homepage-redesign-design.md` (read for full rationale/context before starting).

---

## Task 1: Navy color tokens

**Files:**
- Modify: `frontend/tailwind.config.js`
- Test: `frontend/tailwind.config.test.js`

**Interfaces:**
- Produces: `navy.{950,900,800}` Tailwind color tokens (`bg-navy-950`, `text-navy-900`, etc.), consumed by Tasks 20 (PublicFooter), 18 (BrowseProductsBanner), 24 (Navbar).

- [ ] **Step 1: Write the failing test**

```js
// frontend/tailwind.config.test.js
import { describe, expect, it } from 'vitest';
import config from './tailwind.config.js';

describe('tailwind.config.js', () => {
  it('defines the navy color family used by the dark header/footer', () => {
    expect(config.theme.extend.colors.navy).toEqual({
      950: '#020d18',
      900: '#071426',
      800: '#0b1c33',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run tailwind.config.test.js`
Expected: FAIL — `config.theme.extend.colors.navy` is `undefined`.

- [ ] **Step 3: Add the tokens**

In `frontend/tailwind.config.js`, inside `theme.extend.colors`, add after `amazon`:

```js
        amazon: { DEFAULT: '#FF9900', hover: '#E68A00' },
        navy: {
          950: '#020d18',
          900: '#071426',
          800: '#0b1c33',
        },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run tailwind.config.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/tailwind.config.js frontend/tailwind.config.test.js
git commit -m "feat(theme): add navy color tokens for the dark header/footer redesign"
```

---

## Task 2: Backend — add `facebookUrl` to system settings

**Files:**
- Create: `backend/src/main/resources/db/migration/V19__add_settings_facebook_url.sql`
- Modify: `backend/src/main/java/com/twogofindz/backend/entity/SystemSettings.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/response/SettingsResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/request/SettingsRequest.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/mapper/SettingsMapper.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/SettingsServiceImpl.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminSettingsControllerTest.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/admin/ProductPlaceholderImageTest.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicSettingsControllerTest.java`

**Interfaces:**
- Produces: `SettingsResponse.facebookUrl()` / `SettingsRequest.facebookUrl()`, consumed by Task 3 (admin form) and Task 4 (`socialPlatforms.js` reads `settings.facebookUrl` from the public `/api/public/settings` response).

- [ ] **Step 1: Write the failing test**

In `AdminSettingsControllerTest.java`, replace the `update_succeeds_andPersistsAllFields` test body:

```java
    @Test
    void update_succeeds_andPersistsAllFields() throws Exception {
        String token = adminToken();
        SettingsRequest request = new SettingsRequest(
                "logo.png", "hero.jpg", "placeholder.png",
                "https://tiktok.com/@2gofindz", "https://pinterest.com/2gofindz",
                "https://instagram.com/2gofindz", "https://youtube.com/@2gofindz",
                "https://facebook.com/2gofindz",
                "Updated shop bio.", "Updated Headline", "Updated description.",
                "Updated disclosure.", "contact@2gofindz.com");

        mockMvc.perform(put("/api/admin/settings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.heroHeadline").value("Updated Headline"))
                .andExpect(jsonPath("$.data.contactEmail").value("contact@2gofindz.com"))
                .andExpect(jsonPath("$.data.facebookUrl").value("https://facebook.com/2gofindz"));

        mockMvc.perform(get("/api/admin/settings").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data.shopBio").value("Updated shop bio."))
                .andExpect(jsonPath("$.data.facebookUrl").value("https://facebook.com/2gofindz"));
    }
```

Update the other two `new SettingsRequest(...)` call sites in the same file to insert `null` for the new positional argument (right after `youtubeUrl`'s argument, before `shopBio`'s):

```java
        SettingsRequest request = new SettingsRequest(
                null, null, null, null, null, null, null, null, null, null, null, null, "not-an-email");
```

```java
        SettingsRequest request = new SettingsRequest(
                null, null, null, null, null, null, null, null, null, null, null, null, "contact@2gofindz.com");
```

Update the one call site in `ProductPlaceholderImageTest.java`:

```java
        SettingsRequest settingsRequest = new SettingsRequest(
                "logo.png", "hero.jpg", "configured-placeholder.png",
                "https://tiktok.com/@2gofindz", "https://pinterest.com/2gofindz",
                "https://instagram.com/2gofindz", "https://youtube.com/@2gofindz",
                "https://facebook.com/2gofindz",
                "Shop bio for placeholder test.", "Placeholder Test Headline",
                "Placeholder test description.", "Placeholder test disclosure.",
                "placeholder-test@2gofindz.com");
```

In `PublicSettingsControllerTest.java`, add a second test:

```java
    @Test
    void get_includesFacebookUrlField_forCompleteness() throws Exception {
        mockMvc.perform(get("/api/public/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(org.hamcrest.Matchers.hasKey("facebookUrl")));
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `backend/`, with `DOCKER_HOST`/`TESTCONTAINERS_RYUK_DISABLED` set per the Colima Testcontainers setup):
`mvn test -Dtest=AdminSettingsControllerTest,ProductPlaceholderImageTest,PublicSettingsControllerTest`
Expected: FAIL — compilation error, `SettingsRequest` has no 13-arg constructor matching the new call (still 12 params at this point), and `facebookUrl` is not a recognized field.

- [ ] **Step 3: Add the migration**

```sql
-- backend/src/main/resources/db/migration/V19__add_settings_facebook_url.sql
ALTER TABLE system_settings
    ADD COLUMN facebook_url VARCHAR(500) NULL AFTER youtube_url;
```

- [ ] **Step 4: Add the entity field**

In `SystemSettings.java`, after the `youtubeUrl` field:

```java
    @Column(name = "facebook_url", length = 500)
    private String facebookUrl;
```

- [ ] **Step 5: Add the DTO fields**

In `SettingsResponse.java`, after `youtubeUrl`:

```java
public record SettingsResponse(
        String logoImageFilename,
        String heroImageFilename,
        String placeholderImageFilename,
        String tiktokUrl,
        String pinterestUrl,
        String instagramUrl,
        String youtubeUrl,
        String facebookUrl,
        String shopBio,
        String heroHeadline,
        String heroDescription,
        String affiliateDisclosure,
        String contactEmail
) {
}
```

In `SettingsRequest.java`, after `youtubeUrl`:

```java
public record SettingsRequest(
        String logoImageFilename,
        String heroImageFilename,
        String placeholderImageFilename,
        String tiktokUrl,
        String pinterestUrl,
        String instagramUrl,
        String youtubeUrl,
        String facebookUrl,
        String shopBio,
        String heroHeadline,
        String heroDescription,
        @NotBlank(message = "Affiliate disclosure is required.") String affiliateDisclosure,
        @Email(message = "Contact email must be a valid email address.") String contactEmail
) {
}
```

- [ ] **Step 6: Wire the mapper and service**

In `SettingsMapper.java`, `toResponse`, add after `settings.getYoutubeUrl(),`:

```java
                settings.getFacebookUrl(),
```

In `SettingsServiceImpl.java`, `updateSettings`, add after `settings.setYoutubeUrl(request.youtubeUrl());`:

```java
        settings.setFacebookUrl(request.facebookUrl());
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `mvn test -Dtest=AdminSettingsControllerTest,ProductPlaceholderImageTest,PublicSettingsControllerTest`
Expected: PASS

- [ ] **Step 8: Run the full backend suite**

Run: `mvn test`
Expected: PASS (no other test constructs `SettingsRequest`/`SettingsResponse` positionally — confirmed via repo-wide grep during planning).

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/resources/db/migration/V19__add_settings_facebook_url.sql \
        backend/src/main/java/com/twogofindz/backend/entity/SystemSettings.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/SettingsResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/request/SettingsRequest.java \
        backend/src/main/java/com/twogofindz/backend/mapper/SettingsMapper.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/SettingsServiceImpl.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminSettingsControllerTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/ProductPlaceholderImageTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicSettingsControllerTest.java
git commit -m "feat(settings): add facebookUrl field end-to-end"
```

---

## Task 3: Admin Settings page — Facebook URL field

**Files:**
- Modify: `frontend/src/pages/admin/SettingsPage.jsx`
- Modify: `frontend/src/pages/admin/SettingsPage.test.jsx`

**Interfaces:**
- Consumes: `SettingsResponse.facebookUrl` / `SettingsRequest.facebookUrl` (Task 2).

- [ ] **Step 1: Write the failing test**

In `SettingsPage.test.jsx`, add `facebookUrl: 'https://facebook.com/2gofindz'` to the `settings` fixture object, and add a new test:

```jsx
  it('loads and pre-fills the Facebook URL', async () => {
    renderPage();
    expect(await screen.findByLabelText('Facebook URL')).toHaveValue('https://facebook.com/2gofindz');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/admin/SettingsPage.test.jsx`
Expected: FAIL — no element with label "Facebook URL".

- [ ] **Step 3: Add the field**

In `SettingsPage.jsx`, add `facebookUrl: ''` to both `INITIAL_SETTINGS` and `normalizeSettings`'s returned object (`facebookUrl: data.facebookUrl ?? ''`). In the "Social Links" section's grid, after the YouTube URL field:

```jsx
            <div>
              <label htmlFor="facebookUrl" className="mb-1 block text-small font-medium text-body">
                Facebook URL
              </label>
              <input
                id="facebookUrl"
                type="text"
                value={settings.facebookUrl}
                onChange={(event) => handleChange('facebookUrl', event.target.value)}
                className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/admin/SettingsPage.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/admin/SettingsPage.jsx frontend/src/pages/admin/SettingsPage.test.jsx
git commit -m "feat(admin): add Facebook URL field to system settings form"
```

---

## Task 4: Extract `socialPlatforms.js`, add Facebook, update `SocialLinks.jsx`

**Files:**
- Create: `frontend/src/utils/socialPlatforms.js`
- Create: `frontend/src/utils/socialPlatforms.test.js`
- Modify: `frontend/src/components/SocialLinks.jsx`
- Modify: `frontend/src/components/SocialLinks.test.jsx`

**Interfaces:**
- Produces: `SOCIAL_PLATFORMS: Array<{ key: string, label: string, Icon: React.ComponentType<{ className?: string }> }>`, consumed by `SocialLinks.jsx` (this task) and `SocialMediaStrip.jsx` (Task 9).

- [ ] **Step 1: Write the failing test**

```js
// frontend/src/utils/socialPlatforms.test.js
import { describe, expect, it } from 'vitest';
import { SOCIAL_PLATFORMS } from './socialPlatforms.js';

describe('SOCIAL_PLATFORMS', () => {
  it('includes all 5 platforms with a settings key, label, and icon', () => {
    const keys = SOCIAL_PLATFORMS.map((p) => p.key);
    expect(keys).toEqual(['tiktokUrl', 'pinterestUrl', 'instagramUrl', 'youtubeUrl', 'facebookUrl']);
    SOCIAL_PLATFORMS.forEach((platform) => {
      expect(platform.label).toBeTruthy();
      expect(platform.Icon).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/socialPlatforms.test.js`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the module**

```jsx
// frontend/src/utils/socialPlatforms.js
import { Facebook, Instagram, Youtube } from 'lucide-react';

// lucide-react doesn't ship dedicated TikTok/Pinterest icons; use simple inline SVGs for those two.
function TikTokIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z" />
    </svg>
  );
}

function PinterestIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 0a12 12 0 0 0-4.37 23.17c-.06-.94-.11-2.38.02-3.4.12-.93.8-5.95.8-5.95s-.2-.41-.2-1.01c0-.94.55-1.65 1.23-1.65.58 0 .86.44.86.96 0 .59-.37 1.46-.57 2.28-.16.68.35 1.24 1.02 1.24 1.22 0 2.16-1.29 2.16-3.15 0-1.65-1.18-2.8-2.87-2.8-1.96 0-3.11 1.47-3.11 2.98 0 .59.23 1.22.51 1.57a.2.2 0 0 1 .05.2c-.05.22-.18.68-.2.78-.03.13-.11.16-.25.1-.94-.44-1.53-1.81-1.53-2.91 0-2.37 1.72-4.55 4.96-4.55 2.6 0 4.63 1.86 4.63 4.34 0 2.59-1.63 4.67-3.9 4.67-.76 0-1.48-.4-1.72-.86l-.47 1.78c-.17.65-.63 1.47-.94 1.97A12 12 0 1 0 12 0z" />
    </svg>
  );
}

export const SOCIAL_PLATFORMS = [
  { key: 'tiktokUrl', label: 'TikTok', Icon: TikTokIcon },
  { key: 'pinterestUrl', label: 'Pinterest', Icon: PinterestIcon },
  { key: 'instagramUrl', label: 'Instagram', Icon: Instagram },
  { key: 'youtubeUrl', label: 'YouTube', Icon: Youtube },
  { key: 'facebookUrl', label: 'Facebook', Icon: Facebook },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/socialPlatforms.test.js`
Expected: PASS

- [ ] **Step 5: Update `SocialLinks.jsx` to consume it**

Replace the entire file:

```jsx
// frontend/src/components/SocialLinks.jsx
import { SOCIAL_PLATFORMS } from '../utils/socialPlatforms.js';

function SocialLinks({ settings }) {
  const links = SOCIAL_PLATFORMS.filter((link) => settings?.[link.key]);

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {links.map(({ key, label, Icon }) => (
        <a
          key={key}
          href={settings[key]}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600"
        >
          <Icon className="h-[18px] w-[18px]" />
          {label}
        </a>
      ))}
    </div>
  );
}

export default SocialLinks;
```

- [ ] **Step 6: Add a regression test for Facebook support**

In `SocialLinks.test.jsx`, add:

```jsx
  it('renders a Facebook link when facebookUrl is configured', () => {
    render(<SocialLinks settings={{ facebookUrl: 'https://facebook.com/2gofindz' }} />);
    expect(screen.getByRole('link', { name: /facebook/i })).toHaveAttribute('href', 'https://facebook.com/2gofindz');
  });
```

(If the existing test file imports `TikTokIcon`/`PinterestIcon` directly or otherwise reaches into the old local constant, adjust those imports to `../utils/socialPlatforms.js` instead — confirm by reading the file before editing.)

- [ ] **Step 7: Run the full SocialLinks test file**

Run: `cd frontend && npx vitest run src/components/SocialLinks.test.jsx`
Expected: PASS (all existing tests plus the new one).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/utils/socialPlatforms.js frontend/src/utils/socialPlatforms.test.js \
        frontend/src/components/SocialLinks.jsx frontend/src/components/SocialLinks.test.jsx
git commit -m "refactor(social): extract shared platform list and add Facebook support"
```

---

## Task 5: `AffiliateDisclosure.jsx` — optional `className` prop

**Files:**
- Modify: `frontend/src/components/AffiliateDisclosure.jsx`
- Modify: `frontend/src/components/AffiliateDisclosure.test.jsx`

**Interfaces:**
- Produces: `AffiliateDisclosure({ text, className? })` — `className` defaults to the current hardcoded value, so `LivePreview.jsx` and `PublishedBuyingGuidePage.jsx` are unaffected. Consumed with a light-on-dark override by `PublicFooter.jsx` (Task 20) and `AffiliateDisclosurePage.jsx` (Task 23).

- [ ] **Step 1: Write the failing test**

```jsx
  it('accepts a className override for reuse on dark backgrounds, defaulting to the light style', () => {
    const { rerender } = render(<AffiliateDisclosure text="Custom text." />);
    expect(screen.getByText('Custom text.')).toHaveClass('text-slate-500');

    rerender(<AffiliateDisclosure text="Custom text." className="text-white/60" />);
    expect(screen.getByText('Custom text.')).toHaveClass('text-white/60');
    expect(screen.getByText('Custom text.')).not.toHaveClass('text-slate-500');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/AffiliateDisclosure.test.jsx`
Expected: FAIL — the `className` prop is not applied; the override case still has `text-slate-500`.

- [ ] **Step 3: Add the prop**

```jsx
// frontend/src/components/AffiliateDisclosure.jsx
function AffiliateDisclosure({ text, className = 'text-sm leading-relaxed text-slate-500' }) {
  return <p className={className}>{text || 'As an Amazon Associate, 2Go Findz may earn from qualifying purchases. Product prices and availability may change at any time.'}</p>;
}

export default AffiliateDisclosure;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/AffiliateDisclosure.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AffiliateDisclosure.jsx frontend/src/components/AffiliateDisclosure.test.jsx
git commit -m "feat(footer): add className override to AffiliateDisclosure for dark-background reuse"
```

---

## Task 6: `HeroTrustCard.jsx`

**Files:**
- Create: `frontend/src/components/home/HeroTrustCard.jsx`
- Create: `frontend/src/components/home/HeroTrustCard.test.jsx`

**Interfaces:**
- Produces: `HeroTrustCard({ icon: React.ComponentType, title: string, description: string })`, consumed by `HomeHero.jsx` (Task 8).

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/home/HeroTrustCard.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Star } from 'lucide-react';
import HeroTrustCard from './HeroTrustCard.jsx';

describe('HeroTrustCard', () => {
  it('renders the title and description', () => {
    render(<HeroTrustCard icon={Star} title="Top Rated" description="4.8/5 average rating" />);
    expect(screen.getByText('Top Rated')).toBeInTheDocument();
    expect(screen.getByText('4.8/5 average rating')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/home/HeroTrustCard.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```jsx
// frontend/src/components/home/HeroTrustCard.jsx
function HeroTrustCard({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 rounded-card bg-white p-4 shadow-card-hover">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon size={20} aria-hidden="true" />
      </span>
      <div>
        <p className="text-card-title text-heading">{title}</p>
        <p className="text-small text-body">{description}</p>
      </div>
    </div>
  );
}

export default HeroTrustCard;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/home/HeroTrustCard.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/home/HeroTrustCard.jsx frontend/src/components/home/HeroTrustCard.test.jsx
git commit -m "feat(home): add HeroTrustCard component"
```

---

## Task 7: `homeContent.js` config + hero placeholder image

**Files:**
- Create: `frontend/src/config/homeContent.js`
- Create: `frontend/src/config/homeContent.test.js`
- Create: `frontend/public/images/home/hero-placeholder.webp`

**Interfaces:**
- Produces: `HOME_HERO_CONTENT` (badge/shopperCountLabel/trustCards), `HOME_HERO_IMAGE` (string path), consumed by `HomeHero.jsx` (Task 8) and `BrowseProductsBanner.jsx` (Task 18, decorative reuse).

- [ ] **Step 1: Write the failing test**

```js
// frontend/src/config/homeContent.test.js
import { describe, expect, it } from 'vitest';
import { HOME_HERO_CONTENT, HOME_HERO_IMAGE } from './homeContent.js';

describe('homeContent', () => {
  it('exports the hero image path as a single named constant', () => {
    expect(HOME_HERO_IMAGE).toBe('/images/home/hero-placeholder.webp');
  });

  it('exports the promotional hero content', () => {
    expect(HOME_HERO_CONTENT.badge).toBe('WELCOME TO 2GO FINDZ');
    expect(HOME_HERO_CONTENT.shopperCountLabel).toMatch(/25,000\+/);
    expect(HOME_HERO_CONTENT.trustCards.topRated.ratingValue).toBe('4.8/5');
    expect(HOME_HERO_CONTENT.trustCards.handpicked.description).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/config/homeContent.test.js`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the config module**

```js
// frontend/src/config/homeContent.js

// Temporary hero image: replace this source with the final 2Go Findz hero asset.
export const HOME_HERO_IMAGE = '/images/home/hero-placeholder.webp';

// Promotional copy shown on the homepage hero. These are marketing statements, not
// verified real-time statistics (the site has no aggregate review/shopper-count
// system). Edit here, not inline in HomeHero.jsx.
export const HOME_HERO_CONTENT = {
  badge: 'WELCOME TO 2GO FINDZ',
  shopperCountLabel: 'Join 25,000+ smart shoppers finding the best every day.',
  trustCards: {
    topRated: {
      ratingValue: '4.8/5',
      ratingLabel: 'average rating',
      reviewCountLabel: 'from 10,000+ reviews',
    },
    handpicked: {
      description: 'Only the best quality products for you',
    },
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/config/homeContent.test.js`
Expected: PASS

- [ ] **Step 5: Generate the placeholder hero image**

```bash
mkdir -p frontend/public/images/home
python3 - <<'PY'
from PIL import Image

size = 1000
top = (250, 240, 225)     # warm ivory
bottom = (210, 199, 183)  # soft beige/gray
img = Image.new('RGB', (size, size))
pixels = img.load()
for y in range(size):
    t = y / (size - 1)
    r = round(top[0] + (bottom[0] - top[0]) * t)
    g = round(top[1] + (bottom[1] - top[1]) * t)
    b = round(top[2] + (bottom[2] - top[2]) * t)
    for x in range(size):
        pixels[x, y] = (r, g, b)
img.save('frontend/public/images/home/hero-placeholder.webp', 'WEBP', quality=90)
PY
```

Verify: `file frontend/public/images/home/hero-placeholder.webp` reports a valid WebP image, no embedded text or logos, square aspect ratio.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/config/homeContent.js frontend/src/config/homeContent.test.js \
        frontend/public/images/home/hero-placeholder.webp
git commit -m "feat(home): add hero content config and temporary placeholder image"
```

---

## Task 8: `HomeHero.jsx`

**Files:**
- Create: `frontend/src/components/home/HomeHero.jsx`
- Create: `frontend/src/components/home/HomeHero.test.jsx`

**Interfaces:**
- Consumes: `HeroTrustCard` (Task 6), `HOME_HERO_CONTENT`/`HOME_HERO_IMAGE` (Task 7), `Button` (existing, supports `to` prop for router links).
- Produces: `HomeHero({ headline: string, description: string })`, consumed by `HomePage.jsx` (Task 26).

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/home/HomeHero.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import HomeHero from './HomeHero.jsx';

function renderHero(props = {}) {
  return render(
    <MemoryRouter>
      <HomeHero headline="Smart Finds. Better Buys." description="Discover trending products." {...props} />
    </MemoryRouter>
  );
}

describe('HomeHero', () => {
  it('renders the headline as the page h1', () => {
    renderHero();
    expect(screen.getByRole('heading', { level: 1, name: 'Smart Finds. Better Buys.' })).toBeInTheDocument();
  });

  it('renders the description', () => {
    renderHero();
    expect(screen.getByText('Discover trending products.')).toBeInTheDocument();
  });

  it('links the primary CTA to /trending', () => {
    renderHero();
    expect(screen.getByRole('link', { name: 'View Trending Finds' })).toHaveAttribute('href', '/trending');
  });

  it('links the secondary CTA to /categories', () => {
    renderHero();
    expect(screen.getByRole('link', { name: 'Browse Categories' })).toHaveAttribute('href', '/categories');
  });

  it('renders the Top Rated and Handpicked trust cards', () => {
    renderHero();
    expect(screen.getByText('Top Rated')).toBeInTheDocument();
    expect(screen.getByText('Handpicked')).toBeInTheDocument();
  });

  it('renders the promotional shopper-count label', () => {
    renderHero();
    expect(screen.getByText(/join 25,000\+ smart shoppers/i)).toBeInTheDocument();
  });

  it('renders the welcome badge', () => {
    renderHero();
    expect(screen.getByText('WELCOME TO 2GO FINDZ')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/home/HomeHero.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```jsx
// frontend/src/components/home/HomeHero.jsx
import { Sparkles, Star } from 'lucide-react';
import Button from '../Button.jsx';
import HeroTrustCard from './HeroTrustCard.jsx';
import { HOME_HERO_CONTENT, HOME_HERO_IMAGE } from '../../config/homeContent.js';

const AVATAR_INITIALS = ['A', 'M', 'S', 'K'];

function HomeHero({ headline, description }) {
  const { badge, shopperCountLabel, trustCards } = HOME_HERO_CONTENT;

  return (
    <section className="relative overflow-hidden bg-surface-secondary py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-small font-semibold uppercase tracking-wide text-primary">
            <Sparkles size={16} aria-hidden="true" />
            {badge}
          </span>
          <h1 className="mt-6 text-hero text-heading">{headline}</h1>
          <p className="mt-6 max-w-xl text-subtitle text-body">{description}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button variant="primary" to="/trending">
              View Trending Finds
            </Button>
            <Button variant="secondary" to="/categories">
              Browse Categories
            </Button>
          </div>
          <div className="mt-10 flex items-center gap-3">
            <div className="flex -space-x-3" aria-hidden="true">
              {AVATAR_INITIALS.map((initial, index) => (
                <span
                  key={initial}
                  style={{ zIndex: AVATAR_INITIALS.length - index }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary text-small font-semibold text-white"
                >
                  {initial}
                </span>
              ))}
            </div>
            <p className="text-small text-body">{shopperCountLabel}</p>
          </div>
        </div>

        <div className="relative">
          <img
            src={HOME_HERO_IMAGE}
            alt=""
            loading="eager"
            width={640}
            height={640}
            className="aspect-square w-full rounded-card object-cover shadow-card-hover"
          />
          <div className="absolute -left-4 top-8 hidden w-64 sm:block">
            <HeroTrustCard
              icon={Star}
              title="Top Rated"
              description={`${trustCards.topRated.ratingValue} ${trustCards.topRated.ratingLabel} — ${trustCards.topRated.reviewCountLabel}`}
            />
          </div>
          <div className="absolute -right-4 bottom-8 hidden w-64 sm:block">
            <HeroTrustCard icon={Sparkles} title="Handpicked" description={trustCards.handpicked.description} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default HomeHero;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/home/HomeHero.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/home/HomeHero.jsx frontend/src/components/home/HomeHero.test.jsx
git commit -m "feat(home): add HomeHero component"
```

---

## Task 9: `SocialMediaStrip.jsx`

**Files:**
- Create: `frontend/src/components/home/SocialMediaStrip.jsx`
- Create: `frontend/src/components/home/SocialMediaStrip.test.jsx`

**Interfaces:**
- Consumes: `SOCIAL_PLATFORMS` (Task 4).
- Produces: `SocialMediaStrip({ settings })`, consumed by `HomePage.jsx` (Task 26) and `PublicFooter.jsx` (Task 20).

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/home/SocialMediaStrip.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SocialMediaStrip from './SocialMediaStrip.jsx';

describe('SocialMediaStrip', () => {
  it('renders nothing when no platforms are configured', () => {
    const { container } = render(<SocialMediaStrip settings={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders only the configured platforms', () => {
    render(<SocialMediaStrip settings={{ instagramUrl: 'https://instagram.com/2gofindz' }} />);
    expect(screen.getByRole('link', { name: /instagram/i })).toHaveAttribute(
      'href',
      'https://instagram.com/2gofindz'
    );
    expect(screen.queryByText('TikTok')).not.toBeInTheDocument();
  });

  it('derives a handle from the profile URL path', () => {
    render(<SocialMediaStrip settings={{ instagramUrl: 'https://instagram.com/2gofindz' }} />);
    expect(screen.getByText('@2gofindz')).toBeInTheDocument();
  });

  it('opens links in a new tab safely', () => {
    render(<SocialMediaStrip settings={{ instagramUrl: 'https://instagram.com/2gofindz' }} />);
    const link = screen.getByRole('link', { name: /instagram/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/home/SocialMediaStrip.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```jsx
// frontend/src/components/home/SocialMediaStrip.jsx
import { SOCIAL_PLATFORMS } from '../../utils/socialPlatforms.js';

function extractHandle(url) {
  try {
    const { pathname } = new URL(url);
    const segment = pathname.replace(/\/$/, '').split('/').pop();
    return segment ? `@${segment.replace(/^@/, '')}` : null;
  } catch {
    return null;
  }
}

function SocialMediaStrip({ settings }) {
  const platforms = SOCIAL_PLATFORMS.filter((platform) => settings?.[platform.key]);
  if (platforms.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center divide-x divide-border">
      {platforms.map(({ key, label, Icon }) => {
        const url = settings[key];
        const handle = extractHandle(url);
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-2 text-body transition hover:text-primary"
          >
            <Icon className="h-5 w-5" />
            <span className="text-small font-semibold">{label}</span>
            {handle && <span className="text-small text-muted">{handle}</span>}
          </a>
        );
      })}
    </div>
  );
}

export default SocialMediaStrip;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/home/SocialMediaStrip.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/home/SocialMediaStrip.jsx frontend/src/components/home/SocialMediaStrip.test.jsx
git commit -m "feat(home): add SocialMediaStrip component"
```

---

## Task 10: `HomeSectionCard.jsx`

**Files:**
- Create: `frontend/src/components/home/HomeSectionCard.jsx`
- Create: `frontend/src/components/home/HomeSectionCard.test.jsx`

**Interfaces:**
- Produces: `HomeSectionCard({ icon?: React.ComponentType, title: string, description?: string, viewAllHref?: string, viewAllLabel?: string, children })`, consumed by `HomePage.jsx` (Task 26).

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/home/HomeSectionCard.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Flame } from 'lucide-react';
import HomeSectionCard from './HomeSectionCard.jsx';

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <HomeSectionCard
        icon={Flame}
        title="Trending Right Now"
        description="What everyone's buying."
        viewAllHref="/trending"
        {...props}
      >
        <p>content</p>
      </HomeSectionCard>
    </MemoryRouter>
  );
}

describe('HomeSectionCard', () => {
  it('renders the title and description', () => {
    renderCard();
    expect(screen.getByRole('heading', { name: 'Trending Right Now' })).toBeInTheDocument();
    expect(screen.getByText("What everyone's buying.")).toBeInTheDocument();
  });

  it('renders a View all link to the given href', () => {
    renderCard();
    expect(screen.getByRole('link', { name: /view all/i })).toHaveAttribute('href', '/trending');
  });

  it('renders children content', () => {
    renderCard();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('omits the View all link when no href is given', () => {
    renderCard({ viewAllHref: undefined });
    expect(screen.queryByRole('link', { name: /view all/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/home/HomeSectionCard.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```jsx
// frontend/src/components/home/HomeSectionCard.jsx
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

function HomeSectionCard({ icon: Icon, title, description, viewAllHref, viewAllLabel = 'View all', children }) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon size={20} aria-hidden="true" />
            </span>
          )}
          <div>
            <h2 className="text-section-heading text-heading">{title}</h2>
            {description && <p className="mt-1 text-small text-body">{description}</p>}
          </div>
        </div>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="flex items-center gap-1 text-small font-semibold text-primary hover:underline"
          >
            {viewAllLabel}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export default HomeSectionCard;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/home/HomeSectionCard.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/home/HomeSectionCard.jsx frontend/src/components/home/HomeSectionCard.test.jsx
git commit -m "feat(home): add HomeSectionCard component"
```

---

## Task 11: `HomepageProductCard.jsx`

**Files:**
- Create: `frontend/src/components/home/HomepageProductCard.jsx`
- Create: `frontend/src/components/home/HomepageProductCard.test.jsx`

**Interfaces:**
- Consumes: `getImageUrl` (`frontend/src/utils/imageUrl.js`, existing), `recordClick` (`frontend/src/services/trackingService.js`, existing).
- Produces: `HomepageProductCard({ product })`, consumed by `ProductCarousel.jsx` (Task 12).

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/home/HomepageProductCard.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import HomepageProductCard from './HomepageProductCard.jsx';
import * as trackingService from '../../services/trackingService.js';

const product = {
  id: 1,
  name: 'Wireless Earbuds',
  imageFileName: 'img_example.jpg',
  productLink: 'https://amazon.com/dp/example',
};

describe('HomepageProductCard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders only the product image and name — no description, price, or button', () => {
    render(<HomepageProductCard product={product} />);
    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument();
    expect(screen.queryByText(/check price/i)).not.toBeInTheDocument();
  });

  it('links the whole card to the real Amazon product link with safe rel attributes', () => {
    render(<HomepageProductCard product={product} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', product.productLink);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');
  });

  it('records a click with the stored session id when clicked', async () => {
    sessionStorage.setItem('sessionId', 'test-session-abc');
    vi.spyOn(trackingService, 'recordClick').mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<HomepageProductCard product={product} />);

    await user.click(screen.getByRole('link'));

    expect(trackingService.recordClick).toHaveBeenCalledWith(product.id, 'test-session-abc');
  });

  it('renders a placeholder message when there is no product image', () => {
    render(<HomepageProductCard product={{ ...product, imageFileName: null }} />);
    expect(screen.getByText('No image available')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/home/HomepageProductCard.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```jsx
// frontend/src/components/home/HomepageProductCard.jsx
import { getImageUrl } from '../../utils/imageUrl.js';
import { recordClick } from '../../services/trackingService.js';

function HomepageProductCard({ product }) {
  const imageUrl = getImageUrl(product.imageFileName);

  function handleClick() {
    const sessionId = sessionStorage.getItem('sessionId');
    recordClick(product.id, sessionId).catch(() => {
      // Click tracking is best-effort; never block the link's native navigation on a tracking failure.
    });
  }

  return (
    <a
      href={product.productLink}
      onClick={handleClick}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      className="group flex w-full flex-col overflow-hidden rounded-card border border-slate-200 bg-white shadow-card transition-shadow duration-200 hover:shadow-card-hover"
    >
      <div className="aspect-square overflow-hidden bg-slate-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            No image available
          </div>
        )}
      </div>
      <p className="p-3 text-center text-small font-semibold text-heading">{product.name}</p>
    </a>
  );
}

export default HomepageProductCard;
```

(The image `alt=""` is intentional: the product name is already rendered as visible text inside the same link, so the image is decorative — avoiding a duplicated accessible name like "Wireless Earbuds Wireless Earbuds".)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/home/HomepageProductCard.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/home/HomepageProductCard.jsx frontend/src/components/home/HomepageProductCard.test.jsx
git commit -m "feat(home): add HomepageProductCard component"
```

---

## Task 12: `ProductCarousel.jsx`

**Files:**
- Create: `frontend/src/components/home/ProductCarousel.jsx`
- Create: `frontend/src/components/home/ProductCarousel.test.jsx`

**Interfaces:**
- Consumes: `HomepageProductCard` (Task 11).
- Produces: `ProductCarousel({ products: Array<Product> })`, consumed by `HomePage.jsx` (Task 26).

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/home/ProductCarousel.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProductCarousel from './ProductCarousel.jsx';

const products = [
  { id: 1, name: 'Wireless Earbuds', imageFileName: null, productLink: 'https://amazon.com/dp/1' },
  { id: 2, name: 'Desk Lamp', imageFileName: null, productLink: 'https://amazon.com/dp/2' },
];

describe('ProductCarousel', () => {
  beforeEach(() => {
    // jsdom does not implement Element.scrollBy; stub it so arrow-click handlers can run.
    Element.prototype.scrollBy = vi.fn();
  });

  it('renders a card for every product', () => {
    render(<ProductCarousel products={products} />);
    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument();
    expect(screen.getByText('Desk Lamp')).toBeInTheDocument();
  });

  it('renders nothing when there are no products', () => {
    const { container } = render(<ProductCarousel products={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('disables the previous button at the start of the list', () => {
    render(<ProductCarousel products={products} />);
    expect(screen.getByRole('button', { name: 'Scroll to previous products' })).toBeDisabled();
  });

  it('enables the next button when there is more than one product', () => {
    render(<ProductCarousel products={products} />);
    expect(screen.getByRole('button', { name: 'Scroll to next products' })).toBeEnabled();
  });

  it('disables the next button when there is only one product', () => {
    render(<ProductCarousel products={[products[0]]} />);
    expect(screen.getByRole('button', { name: 'Scroll to next products' })).toBeDisabled();
  });

  it('scrolls forward when the next button is clicked', async () => {
    const user = userEvent.setup();
    render(<ProductCarousel products={products} />);

    await user.click(screen.getByRole('button', { name: 'Scroll to next products' }));

    expect(Element.prototype.scrollBy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/home/ProductCarousel.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```jsx
// frontend/src/components/home/ProductCarousel.jsx
import { useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import HomepageProductCard from './HomepageProductCard.jsx';

function ProductCarousel({ products }) {
  const scrollRef = useRef(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(products.length > 1);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 0);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  function scrollByCard(direction) {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('[data-carousel-item]');
    const step = card ? card.getBoundingClientRect().width + 16 : el.clientWidth;
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  if (products.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
      >
        {products.map((product) => (
          <div key={product.id} data-carousel-item className="w-[220px] shrink-0 snap-start">
            <HomepageProductCard product={product} />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          disabled={!canScrollPrev}
          aria-label="Scroll to previous products"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => scrollByCard(1)}
          disabled={!canScrollNext}
          aria-label="Scroll to next products"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default ProductCarousel;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/home/ProductCarousel.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/home/ProductCarousel.jsx frontend/src/components/home/ProductCarousel.test.jsx
git commit -m "feat(home): add ProductCarousel component"
```

---

## Task 13: `CompactProductRow.jsx`

**Files:**
- Create: `frontend/src/components/home/CompactProductRow.jsx`
- Create: `frontend/src/components/home/CompactProductRow.test.jsx`

**Interfaces:**
- Consumes: `getImageUrl`, `recordClick` (existing).
- Produces: `CompactProductRow({ product })`, consumed by `TrendingRightNowSection.jsx` (Task 14) and `BestSellersSection.jsx` (Task 15).

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/home/CompactProductRow.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CompactProductRow from './CompactProductRow.jsx';
import * as trackingService from '../../services/trackingService.js';

const product = {
  id: 1,
  name: 'Desk Lamp',
  imageFileName: null,
  productLink: 'https://amazon.com/dp/example',
};

describe('CompactProductRow', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the product name', () => {
    render(<CompactProductRow product={product} />);
    expect(screen.getByText('Desk Lamp')).toBeInTheDocument();
  });

  it('links the whole row to the real Amazon product link with safe rel attributes', () => {
    render(<CompactProductRow product={product} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', product.productLink);
    expect(link).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');
  });

  it('records a click with the stored session id when clicked', async () => {
    sessionStorage.setItem('sessionId', 'test-session-abc');
    vi.spyOn(trackingService, 'recordClick').mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CompactProductRow product={product} />);

    await user.click(screen.getByRole('link'));

    expect(trackingService.recordClick).toHaveBeenCalledWith(product.id, 'test-session-abc');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/home/CompactProductRow.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```jsx
// frontend/src/components/home/CompactProductRow.jsx
import { getImageUrl } from '../../utils/imageUrl.js';
import { recordClick } from '../../services/trackingService.js';

function CompactProductRow({ product }) {
  const imageUrl = getImageUrl(product.imageFileName);

  function handleClick() {
    const sessionId = sessionStorage.getItem('sessionId');
    recordClick(product.id, sessionId).catch(() => {
      // Click tracking is best-effort; never block the link's native navigation on a tracking failure.
    });
  }

  return (
    <a
      href={product.productLink}
      onClick={handleClick}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      className="flex items-center gap-3 rounded-btn p-2 transition hover:bg-surface-secondary"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-btn bg-slate-100">
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">No image</div>
        )}
      </div>
      <span className="text-small font-medium text-heading">{product.name}</span>
    </a>
  );
}

export default CompactProductRow;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/home/CompactProductRow.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/home/CompactProductRow.jsx frontend/src/components/home/CompactProductRow.test.jsx
git commit -m "feat(home): add CompactProductRow component"
```

---

## Task 14: `TrendingRightNowSection.jsx`

**Files:**
- Create: `frontend/src/components/home/TrendingRightNowSection.jsx`
- Create: `frontend/src/components/home/TrendingRightNowSection.test.jsx`

**Interfaces:**
- Consumes: `CompactProductRow` (Task 13), `getImageUrl`, `recordClick` (existing).
- Produces: `TrendingRightNowSection({ products: Array<Product> })`, consumed by `HomePage.jsx` (Task 26).

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/home/TrendingRightNowSection.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TrendingRightNowSection from './TrendingRightNowSection.jsx';

const products = [
  { id: 1, name: 'Featured Trend', imageFileName: null, productLink: 'https://amazon.com/dp/1' },
  { id: 2, name: 'Row One', imageFileName: null, productLink: 'https://amazon.com/dp/2' },
  { id: 3, name: 'Row Two', imageFileName: null, productLink: 'https://amazon.com/dp/3' },
  { id: 4, name: 'Row Three', imageFileName: null, productLink: 'https://amazon.com/dp/4' },
];

describe('TrendingRightNowSection', () => {
  it('renders nothing with no products', () => {
    const { container } = render(<TrendingRightNowSection products={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the first product as the large featured image', () => {
    render(<TrendingRightNowSection products={products} />);
    expect(screen.getByRole('link', { name: 'Featured Trend' })).toBeInTheDocument();
  });

  it('renders up to 3 compact rows for the remaining products', () => {
    render(<TrendingRightNowSection products={products} />);
    expect(screen.getByText('Row One')).toBeInTheDocument();
    expect(screen.getByText('Row Two')).toBeInTheDocument();
    expect(screen.getByText('Row Three')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/home/TrendingRightNowSection.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```jsx
// frontend/src/components/home/TrendingRightNowSection.jsx
import CompactProductRow from './CompactProductRow.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { recordClick } from '../../services/trackingService.js';

function TrendingRightNowSection({ products }) {
  if (products.length === 0) return null;

  const [featured, ...rest] = products;
  const rows = rest.slice(0, 3);
  const imageUrl = getImageUrl(featured.imageFileName);

  function handleFeaturedClick() {
    const sessionId = sessionStorage.getItem('sessionId');
    recordClick(featured.id, sessionId).catch(() => {
      // Click tracking is best-effort; never block the link's native navigation on a tracking failure.
    });
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <a
        href={featured.productLink}
        onClick={handleFeaturedClick}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        aria-label={featured.name}
        className="group block overflow-hidden rounded-card bg-slate-100"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center text-sm text-slate-400">
            No image available
          </div>
        )}
        <p className="p-3 text-small font-semibold text-heading">{featured.name}</p>
      </a>

      <div className="flex flex-col gap-2">
        {rows.map((product) => (
          <CompactProductRow key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

export default TrendingRightNowSection;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/home/TrendingRightNowSection.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/home/TrendingRightNowSection.jsx frontend/src/components/home/TrendingRightNowSection.test.jsx
git commit -m "feat(home): add TrendingRightNowSection component"
```

---

## Task 15: `BestSellersSection.jsx`

**Files:**
- Create: `frontend/src/components/home/BestSellersSection.jsx`
- Create: `frontend/src/components/home/BestSellersSection.test.jsx`

**Interfaces:**
- Consumes: `CompactProductRow` (Task 13).
- Produces: `BestSellersSection({ products: Array<Product> })`, consumed by `HomePage.jsx` (Task 26).

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/home/BestSellersSection.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BestSellersSection from './BestSellersSection.jsx';

const products = [
  { id: 1, name: 'Row One', imageFileName: null, productLink: 'https://amazon.com/dp/1' },
  { id: 2, name: 'Row Two', imageFileName: null, productLink: 'https://amazon.com/dp/2' },
  { id: 3, name: 'Row Three', imageFileName: null, productLink: 'https://amazon.com/dp/3' },
  { id: 4, name: 'Row Four', imageFileName: null, productLink: 'https://amazon.com/dp/4' },
];

describe('BestSellersSection', () => {
  it('renders nothing with no products', () => {
    const { container } = render(<BestSellersSection products={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders at most 3 compact rows', () => {
    render(<BestSellersSection products={products} />);
    expect(screen.getByText('Row One')).toBeInTheDocument();
    expect(screen.getByText('Row Two')).toBeInTheDocument();
    expect(screen.getByText('Row Three')).toBeInTheDocument();
    expect(screen.queryByText('Row Four')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/home/BestSellersSection.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```jsx
// frontend/src/components/home/BestSellersSection.jsx
import CompactProductRow from './CompactProductRow.jsx';

function BestSellersSection({ products }) {
  if (products.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {products.slice(0, 3).map((product) => (
        <CompactProductRow key={product.id} product={product} />
      ))}
    </div>
  );
}

export default BestSellersSection;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/home/BestSellersSection.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/home/BestSellersSection.jsx frontend/src/components/home/BestSellersSection.test.jsx
git commit -m "feat(home): add BestSellersSection component"
```

---

## Task 16: `HomeCategoryCard.jsx`

**Files:**
- Create: `frontend/src/components/home/HomeCategoryCard.jsx`
- Create: `frontend/src/components/home/HomeCategoryCard.test.jsx`

**Interfaces:**
- Produces: `HomeCategoryCard({ category: { id, productCategoryName } })`, consumed by `CategoryGridSection.jsx` (Task 17). Does **not** modify `CategoryCard.jsx` (still used unchanged by `CategoriesPage.jsx`).

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/home/HomeCategoryCard.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import HomeCategoryCard from './HomeCategoryCard.jsx';

function renderCard(category) {
  return render(
    <MemoryRouter>
      <HomeCategoryCard category={category} />
    </MemoryRouter>
  );
}

describe('HomeCategoryCard', () => {
  it('renders the category name', () => {
    renderCard({ id: 1, productCategoryName: 'Electronics' });
    expect(screen.getByText('Electronics')).toBeInTheDocument();
  });

  it('links to the categories page filtered by this category id', () => {
    renderCard({ id: 7, productCategoryName: 'Home & Kitchen' });
    expect(screen.getByRole('link', { name: /home & kitchen/i })).toHaveAttribute(
      'href',
      '/categories?category=7'
    );
  });

  it('falls back to a generic icon for an unrecognized category name', () => {
    renderCard({ id: 9, productCategoryName: 'Miscellaneous Widgets' });
    expect(screen.getByText('Miscellaneous Widgets')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/home/HomeCategoryCard.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```jsx
// frontend/src/components/home/HomeCategoryCard.jsx
import { Link } from 'react-router-dom';
import { Baby, Dumbbell, Home as HomeIcon, Laptop, Shirt, Sparkles, Tag, Utensils } from 'lucide-react';

const KEYWORD_ICONS = [
  { keywords: ['electronic', 'tech', 'computer', 'laptop'], icon: Laptop },
  { keywords: ['kitchen', 'dining', 'cook'], icon: Utensils },
  { keywords: ['home', 'furniture'], icon: HomeIcon },
  { keywords: ['fashion', 'clothing', 'apparel', 'wear'], icon: Shirt },
  { keywords: ['fitness', 'sport', 'outdoor'], icon: Dumbbell },
  { keywords: ['baby', 'kid', 'toy'], icon: Baby },
  { keywords: ['beauty', 'health', 'personal care'], icon: Sparkles },
];

function iconForCategory(name = '') {
  const lower = name.toLowerCase();
  const match = KEYWORD_ICONS.find(({ keywords }) => keywords.some((keyword) => lower.includes(keyword)));
  return match ? match.icon : Tag;
}

function HomeCategoryCard({ category }) {
  const Icon = iconForCategory(category.productCategoryName);

  return (
    <Link
      to={`/categories?category=${category.id}`}
      className="flex flex-col items-center gap-3 rounded-card border border-slate-200 bg-white px-6 py-8 text-center shadow-card transition hover:-translate-y-1 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon size={24} aria-hidden="true" />
      </span>
      <span className="text-card-title text-heading">{category.productCategoryName}</span>
    </Link>
  );
}

export default HomeCategoryCard;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/home/HomeCategoryCard.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/home/HomeCategoryCard.jsx frontend/src/components/home/HomeCategoryCard.test.jsx
git commit -m "feat(home): add HomeCategoryCard component"
```

---

## Task 17: `CategoryGridSection.jsx`

**Files:**
- Create: `frontend/src/components/home/CategoryGridSection.jsx`
- Create: `frontend/src/components/home/CategoryGridSection.test.jsx`

**Interfaces:**
- Consumes: `HomeCategoryCard` (Task 16).
- Produces: `CategoryGridSection({ categories: Array<Category> })`, consumed by `HomePage.jsx` (Task 26).

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/home/CategoryGridSection.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import CategoryGridSection from './CategoryGridSection.jsx';

const categories = [
  { id: 1, productCategoryName: 'Electronics' },
  { id: 2, productCategoryName: 'Home & Kitchen' },
];

describe('CategoryGridSection', () => {
  it('renders nothing with no categories', () => {
    const { container } = render(
      <MemoryRouter>
        <CategoryGridSection categories={[]} />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a card for every category', () => {
    render(
      <MemoryRouter>
        <CategoryGridSection categories={categories} />
      </MemoryRouter>
    );
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Home & Kitchen')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/home/CategoryGridSection.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```jsx
// frontend/src/components/home/CategoryGridSection.jsx
import HomeCategoryCard from './HomeCategoryCard.jsx';

function CategoryGridSection({ categories }) {
  if (categories.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((category) => (
        <HomeCategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
}

export default CategoryGridSection;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/home/CategoryGridSection.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/home/CategoryGridSection.jsx frontend/src/components/home/CategoryGridSection.test.jsx
git commit -m "feat(home): add CategoryGridSection component"
```

---

## Task 18: `BrowseProductsBanner.jsx`

**Files:**
- Create: `frontend/src/components/home/BrowseProductsBanner.jsx`
- Create: `frontend/src/components/home/BrowseProductsBanner.test.jsx`

**Interfaces:**
- Consumes: `Button` (existing), `HOME_HERO_IMAGE` (Task 7, decorative reuse — no new binary asset).
- Produces: `BrowseProductsBanner()`, consumed by `HomePage.jsx` (Task 26).

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/home/BrowseProductsBanner.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import BrowseProductsBanner from './BrowseProductsBanner.jsx';

describe('BrowseProductsBanner', () => {
  it('links its button to /products', () => {
    render(
      <MemoryRouter>
        <BrowseProductsBanner />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Browse All Products' })).toHaveAttribute('href', '/products');
  });

  it('renders the promotional heading', () => {
    render(
      <MemoryRouter>
        <BrowseProductsBanner />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Browse All Products' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/home/BrowseProductsBanner.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```jsx
// frontend/src/components/home/BrowseProductsBanner.jsx
import Button from '../Button.jsx';
import { HOME_HERO_IMAGE } from '../../config/homeContent.js';

function BrowseProductsBanner() {
  return (
    <div className="relative overflow-hidden rounded-card bg-navy-900 px-6 py-12 text-center sm:px-12">
      <img
        src={HOME_HERO_IMAGE}
        alt=""
        loading="lazy"
        className="pointer-events-none absolute -left-10 -top-10 hidden h-48 w-48 rounded-card object-cover opacity-20 sm:block"
      />
      <img
        src={HOME_HERO_IMAGE}
        alt=""
        loading="lazy"
        className="pointer-events-none absolute -bottom-10 -right-10 hidden h-48 w-48 rounded-card object-cover opacity-20 sm:block"
      />
      <div className="relative">
        <h2 className="text-section-heading text-white">Browse All Products</h2>
        <p className="mx-auto mt-2 max-w-xl text-subtitle text-white/80">
          Search, filter, and sort our full catalog to find exactly what you need.
        </p>
        <Button variant="primary" to="/products" className="mt-6">
          Browse All Products
        </Button>
      </div>
    </div>
  );
}

export default BrowseProductsBanner;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/home/BrowseProductsBanner.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/home/BrowseProductsBanner.jsx frontend/src/components/home/BrowseProductsBanner.test.jsx
git commit -m "feat(home): add BrowseProductsBanner component"
```

---

## Task 19: `NewsletterForm.jsx`

**Files:**
- Create: `frontend/src/components/NewsletterForm.jsx`
- Create: `frontend/src/components/NewsletterForm.test.jsx`

**Interfaces:**
- Produces: `NewsletterForm()`, consumed by `PublicFooter.jsx` (Task 20).

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/NewsletterForm.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import NewsletterForm from './NewsletterForm.jsx';

describe('NewsletterForm', () => {
  it('renders a real email input and subscribe button', () => {
    render(<NewsletterForm />);
    expect(screen.getByLabelText('Subscribe to our newsletter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeInTheDocument();
  });

  it('shows an honest unavailable message on submit instead of a silent no-op or fake success', async () => {
    const user = userEvent.setup();
    render(<NewsletterForm />);

    await user.type(screen.getByLabelText('Subscribe to our newsletter'), 'shopper@example.com');
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));

    expect(await screen.findByText(/newsletter signup isn't available yet/i)).toBeInTheDocument();
  });

  it('marks the email input as required', () => {
    render(<NewsletterForm />);
    expect(screen.getByLabelText('Subscribe to our newsletter')).toBeRequired();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/NewsletterForm.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```jsx
// frontend/src/components/NewsletterForm.jsx
import { useState } from 'react';

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setMessage("Newsletter signup isn't available yet — check back soon.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor="newsletter-email" className="text-small font-semibold text-white">
        Subscribe to our newsletter
      </label>
      <div className="flex gap-2">
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-search border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-white"
        />
        <button
          type="submit"
          className="shrink-0 rounded-btn bg-white px-4 py-2.5 text-btn text-navy-900 transition hover:bg-white/90"
        >
          Subscribe
        </button>
      </div>
      {message && (
        <p role="status" className="text-small text-white/70">
          {message}
        </p>
      )}
    </form>
  );
}

export default NewsletterForm;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/NewsletterForm.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/NewsletterForm.jsx frontend/src/components/NewsletterForm.test.jsx
git commit -m "feat(footer): add NewsletterForm component with an honest unavailable state"
```

---

## Task 20: `PublicFooter.jsx`

**Files:**
- Create: `frontend/src/components/PublicFooter.jsx`
- Create: `frontend/src/components/PublicFooter.test.jsx`

**Interfaces:**
- Consumes: `SocialMediaStrip` (Task 9), `NewsletterForm` (Task 19), `AffiliateDisclosure` (Task 5).
- Produces: `PublicFooter({ settings })` — identical prop signature to the `Footer` it replaces, consumed by Tasks 21, 22, 26.

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/PublicFooter.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PublicFooter from './PublicFooter.jsx';

const settings = {
  affiliateDisclosure: 'Custom disclosure text.',
  contactEmail: 'hello@2gofindz.com',
  instagramUrl: 'https://instagram.com/2gofindz',
};

function renderFooter(props = { settings }) {
  return render(
    <MemoryRouter>
      <PublicFooter {...props} />
    </MemoryRouter>
  );
}

describe('PublicFooter', () => {
  it('renders the brand name and affiliate disclosure', () => {
    renderFooter();
    expect(screen.getByText('2Go Findz')).toBeInTheDocument();
    expect(screen.getByText('Custom disclosure text.')).toBeInTheDocument();
  });

  it('falls back to the default disclosure text when settings has none', () => {
    renderFooter({ settings: null });
    expect(
      screen.getByText(/as an amazon associate, 2go findz may earn from qualifying purchases/i)
    ).toBeInTheDocument();
  });

  it('renders Shop, Discover, and Company link columns with real routes', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'Trending' })).toHaveAttribute('href', '/trending');
    expect(screen.getByRole('link', { name: 'Best Sellers' })).toHaveAttribute('href', '/best-sellers');
    expect(screen.getByRole('link', { name: 'New Arrivals' })).toHaveAttribute(
      'href',
      '/products?sort=createdAt,desc'
    );
    expect(screen.getByRole('link', { name: 'All Products' })).toHaveAttribute('href', '/products');
    expect(screen.getByRole('link', { name: 'Categories' })).toHaveAttribute('href', '/categories');
    expect(screen.getByRole('link', { name: 'Buying Guides' })).toHaveAttribute('href', '/buying-guides');
    expect(screen.getByRole('link', { name: 'Compare' })).toHaveAttribute('href', '/compare');
    expect(screen.getByRole('link', { name: 'About Us' })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: 'Contact Us' })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy-policy');
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/terms-of-use');
    expect(screen.getByRole('link', { name: 'Affiliate Disclosure' })).toHaveAttribute(
      'href',
      '/affiliate-disclosure'
    );
  });

  it('does not render Deals, Reviews, or Gift Ideas links', () => {
    renderFooter();
    expect(screen.queryByRole('link', { name: 'Deals' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reviews' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Gift Ideas' })).not.toBeInTheDocument();
  });

  it('renders a mailto link for the configured contact email', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'hello@2gofindz.com' })).toHaveAttribute(
      'href',
      'mailto:hello@2gofindz.com'
    );
  });

  it('renders the social strip when a platform is configured', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: /instagram/i })).toBeInTheDocument();
  });

  it('renders the newsletter form', () => {
    renderFooter();
    expect(screen.getByLabelText('Subscribe to our newsletter')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/PublicFooter.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```jsx
// frontend/src/components/PublicFooter.jsx
import { Link } from 'react-router-dom';
import SocialMediaStrip from './home/SocialMediaStrip.jsx';
import NewsletterForm from './NewsletterForm.jsx';
import AffiliateDisclosure from './AffiliateDisclosure.jsx';

const SHOP_LINKS = [
  { to: '/trending', label: 'Trending' },
  { to: '/best-sellers', label: 'Best Sellers' },
  { to: '/products?sort=createdAt,desc', label: 'New Arrivals' },
  { to: '/products', label: 'All Products' },
];

const DISCOVER_LINKS = [
  { to: '/categories', label: 'Categories' },
  { to: '/buying-guides', label: 'Buying Guides' },
  { to: '/compare', label: 'Compare' },
];

const COMPANY_LINKS = [
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact Us' },
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/terms-of-use', label: 'Terms of Use' },
  { to: '/affiliate-disclosure', label: 'Affiliate Disclosure' },
];

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="text-small font-semibold uppercase tracking-wide text-white">{title}</h3>
      <ul className="mt-4 space-y-2">
        {links.map(({ to, label }) => (
          <li key={label}>
            <Link to={to} className="text-small text-white/70 transition hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PublicFooter({ settings }) {
  return (
    <footer className="bg-navy-950 py-16 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <span className="text-card-title text-white">2Go Findz</span>
            <p className="mt-4 max-w-sm text-small text-white/70">
              {settings?.shopBio ??
                'Discover trending Amazon products, everyday essentials, affordable finds, and must-have items carefully selected to help you shop smarter.'}
            </p>
            <div className="mt-6">
              <SocialMediaStrip settings={settings} />
            </div>
          </div>
          <FooterColumn title="Shop" links={SHOP_LINKS} />
          <FooterColumn title="Discover" links={DISCOVER_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <div>
            <NewsletterForm />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p className="text-small text-white/50">&copy; {new Date().getFullYear()} 2Go Findz. All rights reserved.</p>
          {settings?.contactEmail && (
            <a href={`mailto:${settings.contactEmail}`} className="text-small text-white/70 hover:text-white">
              {settings.contactEmail}
            </a>
          )}
        </div>
        <div className="mt-4 text-center sm:text-left">
          <AffiliateDisclosure text={settings?.affiliateDisclosure} className="text-small leading-relaxed text-white/60" />
        </div>
      </div>
    </footer>
  );
}

export default PublicFooter;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/PublicFooter.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/PublicFooter.jsx frontend/src/components/PublicFooter.test.jsx
git commit -m "feat(footer): add PublicFooter component"
```

---

## Task 21: `CatalogPage.jsx` footer swap + `AllProductsPage.jsx` + `/products` route

**Files:**
- Modify: `frontend/src/components/CatalogPage.jsx`
- Modify: `frontend/src/components/CatalogPage.test.jsx`
- Create: `frontend/src/pages/AllProductsPage.jsx`
- Create: `frontend/src/pages/AllProductsPage.test.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `PublicFooter` (Task 20), `CatalogPage` (existing, only its `Footer` import changes).
- Produces: `/products` route rendering `AllProductsPage`, which the Navbar's search (Task 24) and `PublicFooter`'s Shop links (Task 20) navigate to.

- [ ] **Step 1: Write the failing tests**

In `CatalogPage.test.jsx`, add:

```jsx
  it('renders the shared public footer with real company links', async () => {
    renderCatalog();
    expect(await screen.findByRole('link', { name: 'Affiliate Disclosure' })).toHaveAttribute(
      'href',
      '/affiliate-disclosure'
    );
  });
```

Create `AllProductsPage.test.jsx`:

```jsx
// frontend/src/pages/AllProductsPage.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AllProductsPage from './AllProductsPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';

describe('AllProductsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ affiliateDisclosure: 'Disclosure.' });
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
  });

  it('renders the All Products title and description via CatalogPage', async () => {
    render(
      <MemoryRouter>
        <CompareProvider>
          <AllProductsPage />
        </CompareProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'All Products' })).toBeInTheDocument();
    expect(screen.getByText('Search, filter, and sort our full catalog.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/CatalogPage.test.jsx src/pages/AllProductsPage.test.jsx`
Expected: FAIL — `AllProductsPage.jsx` does not exist; `CatalogPage.test.jsx`'s new assertion fails since `Footer.jsx` has no Company links.

- [ ] **Step 3: Swap the footer import in `CatalogPage.jsx`**

Change the import line and usage:

```jsx
import PublicFooter from './PublicFooter.jsx';
```

```jsx
      <PublicFooter settings={settings} />
```

- [ ] **Step 4: Create `AllProductsPage.jsx`**

```jsx
// frontend/src/pages/AllProductsPage.jsx
import CatalogPage from '../components/CatalogPage.jsx';

function AllProductsPage() {
  return <CatalogPage title="All Products" description="Search, filter, and sort our full catalog." />;
}

export default AllProductsPage;
```

- [ ] **Step 5: Add the route**

In `App.jsx`, add the import near the other page imports:

```jsx
import AllProductsPage from './pages/AllProductsPage.jsx';
```

Add the route inside `<Routes>`, right after the `/comparisons/:slug` route (before `/login`):

```jsx
                <Route path="/products" element={<AllProductsPage />} />
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/CatalogPage.test.jsx src/pages/AllProductsPage.test.jsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/CatalogPage.jsx frontend/src/components/CatalogPage.test.jsx \
        frontend/src/pages/AllProductsPage.jsx frontend/src/pages/AllProductsPage.test.jsx \
        frontend/src/App.jsx
git commit -m "feat(products): extract /products catalog route reusing CatalogPage, swap in PublicFooter"
```

---

## Task 22: Footer swap in remaining 5 pages, delete `Footer.jsx`

**Files:**
- Modify: `frontend/src/pages/BuyingGuidesPage.jsx` (+ test)
- Modify: `frontend/src/pages/ComparePage.jsx` (+ test)
- Modify: `frontend/src/pages/ComparisonDetailPage.jsx` (+ test)
- Modify: `frontend/src/pages/ComparisonsPage.jsx` (+ test)
- Modify: `frontend/src/pages/PublishedBuyingGuidePage.jsx` (+ test)
- Delete: `frontend/src/components/Footer.jsx`
- Delete: `frontend/src/components/Footer.test.jsx`

**Interfaces:**
- Consumes: `PublicFooter` (Task 20). Each call site currently uses `<Footer settings={settings} />` — swap to `<PublicFooter settings={settings} />` with an identical prop.

- [ ] **Step 1: Write the failing tests**

Add one test to each of the 5 page test files, asserting the static "Affiliate Disclosure" footer link is present — it doesn't depend on `settings` content, so it's a safe universal check regardless of each page's existing mock setup. Each file's existing render helper (confirmed by reading the files during planning) is used as-is:

```jsx
// frontend/src/pages/BuyingGuidesPage.test.jsx — inside the existing describe block
  it('renders the shared public footer with real company links', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: 'Affiliate Disclosure' })).toHaveAttribute(
      'href',
      '/affiliate-disclosure'
    );
  });
```

```jsx
// frontend/src/pages/ComparePage.test.jsx — inside the existing describe block
  it('renders the shared public footer with real company links', async () => {
    renderComparePage();
    expect(await screen.findByRole('link', { name: 'Affiliate Disclosure' })).toHaveAttribute(
      'href',
      '/affiliate-disclosure'
    );
  });
```

```jsx
// frontend/src/pages/ComparisonDetailPage.test.jsx — inside the existing describe block
  it('renders the shared public footer with real company links', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: 'Affiliate Disclosure' })).toHaveAttribute(
      'href',
      '/affiliate-disclosure'
    );
  });
```

```jsx
// frontend/src/pages/ComparisonsPage.test.jsx — inside the existing describe block
  it('renders the shared public footer with real company links', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: 'Affiliate Disclosure' })).toHaveAttribute(
      'href',
      '/affiliate-disclosure'
    );
  });
```

```jsx
// frontend/src/pages/PublishedBuyingGuidePage.test.jsx — inside the existing describe block
  it('renders the shared public footer with real company links', async () => {
    renderAtSlug('best-wireless-earbuds-under-100');
    expect(await screen.findByRole('link', { name: 'Affiliate Disclosure' })).toHaveAttribute(
      'href',
      '/affiliate-disclosure'
    );
  });
```

- [ ] **Step 2: Run the 5 test files to verify the new assertions fail**

Run: `cd frontend && npx vitest run src/pages/BuyingGuidesPage.test.jsx src/pages/ComparePage.test.jsx src/pages/ComparisonDetailPage.test.jsx src/pages/ComparisonsPage.test.jsx src/pages/PublishedBuyingGuidePage.test.jsx`
Expected: FAIL — no "Affiliate Disclosure" link exists yet (still importing the light `Footer`).

- [ ] **Step 3: Swap the import and usage in each of the 5 page files**

In each file, change:

```jsx
import Footer from '../components/Footer.jsx';
```

to:

```jsx
import PublicFooter from '../components/PublicFooter.jsx';
```

And change every `<Footer settings={settings} />` usage in that file to `<PublicFooter settings={settings} />` (note `PublishedBuyingGuidePage.jsx` has 3 such call sites — update all 3).

- [ ] **Step 4: Run the 5 test files to verify they pass**

Run: `cd frontend && npx vitest run src/pages/BuyingGuidesPage.test.jsx src/pages/ComparePage.test.jsx src/pages/ComparisonDetailPage.test.jsx src/pages/ComparisonsPage.test.jsx src/pages/PublishedBuyingGuidePage.test.jsx`
Expected: PASS

- [ ] **Step 5: Delete the now-unused `Footer.jsx`**

Confirm no remaining references first:

Run: `grep -rl "components/Footer.jsx'" frontend/src`
Expected: no output (only `PublicFooter.jsx` remains referenced).

```bash
rm frontend/src/components/Footer.jsx frontend/src/components/Footer.test.jsx
```

- [ ] **Step 6: Run the full frontend test suite**

Run: `cd frontend && npx vitest run`
Expected: PASS — no test file still imports the deleted `Footer.jsx`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/BuyingGuidesPage.jsx frontend/src/pages/BuyingGuidesPage.test.jsx \
        frontend/src/pages/ComparePage.jsx frontend/src/pages/ComparePage.test.jsx \
        frontend/src/pages/ComparisonDetailPage.jsx frontend/src/pages/ComparisonDetailPage.test.jsx \
        frontend/src/pages/ComparisonsPage.jsx frontend/src/pages/ComparisonsPage.test.jsx \
        frontend/src/pages/PublishedBuyingGuidePage.jsx frontend/src/pages/PublishedBuyingGuidePage.test.jsx
git rm frontend/src/components/Footer.jsx frontend/src/components/Footer.test.jsx
git commit -m "refactor(footer): apply PublicFooter site-wide, remove the old light Footer"
```

---

## Task 23: `StaticPageLayout.jsx` + 5 informational pages

**Files:**
- Create: `frontend/src/components/StaticPageLayout.jsx`
- Create: `frontend/src/components/StaticPageLayout.test.jsx`
- Create: `frontend/src/pages/AboutPage.jsx` (+ test)
- Create: `frontend/src/pages/ContactPage.jsx` (+ test)
- Create: `frontend/src/pages/PrivacyPolicyPage.jsx` (+ test)
- Create: `frontend/src/pages/TermsOfUsePage.jsx` (+ test)
- Create: `frontend/src/pages/AffiliateDisclosurePage.jsx` (+ test)
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/App.test.jsx`

**Interfaces:**
- Consumes: `Navbar` (existing), `PublicFooter` (Task 20), `getSettings` (existing), `AffiliateDisclosure` (Task 5).
- Produces: routes `/about`, `/contact`, `/privacy-policy`, `/terms-of-use`, `/affiliate-disclosure`, all reachable from `PublicFooter`'s Company column (already linked in Task 20).

- [ ] **Step 1: Write the failing test for `StaticPageLayout`**

```jsx
// frontend/src/components/StaticPageLayout.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import StaticPageLayout from './StaticPageLayout.jsx';

describe('StaticPageLayout', () => {
  it('renders the page title as an h1 and the given content', () => {
    render(
      <MemoryRouter>
        <StaticPageLayout title="About Us">
          <p>Body copy.</p>
        </StaticPageLayout>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'About Us' })).toBeInTheDocument();
    expect(screen.getByText('Body copy.')).toBeInTheDocument();
  });

  it('renders the navbar and footer', () => {
    render(
      <MemoryRouter>
        <StaticPageLayout title="About Us">
          <p>Body copy.</p>
        </StaticPageLayout>
      </MemoryRouter>
    );

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Affiliate Disclosure' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/StaticPageLayout.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `StaticPageLayout.jsx`**

```jsx
// frontend/src/components/StaticPageLayout.jsx
import { useEffect, useState } from 'react';
import Navbar from './Navbar.jsx';
import PublicFooter from './PublicFooter.jsx';
import { getSettings } from '../services/settingsService.js';

function StaticPageLayout({ title, children }) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-page-heading text-heading">{title}</h1>
        <div className="mt-8 space-y-4 text-body">{children}</div>
      </main>
      <PublicFooter settings={settings} />
    </div>
  );
}

export default StaticPageLayout;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/StaticPageLayout.test.jsx`
Expected: PASS

- [ ] **Step 5: Write failing tests for the 5 pages**

```jsx
// frontend/src/pages/AboutPage.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AboutPage from './AboutPage.jsx';

describe('AboutPage', () => {
  it('renders the About Us heading and real content', () => {
    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1, name: 'About Us' })).toBeInTheDocument();
    expect(screen.getByText(/curated amazon affiliate storefront/i)).toBeInTheDocument();
  });
});
```

```jsx
// frontend/src/pages/ContactPage.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ContactPage from './ContactPage.jsx';
import * as settingsService from '../services/settingsService.js';

describe('ContactPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a mailto link when a contact email is configured', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ contactEmail: 'hello@2gofindz.com' });
    render(
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>
    );
    expect(await screen.findByRole('link', { name: 'hello@2gofindz.com' })).toHaveAttribute(
      'href',
      'mailto:hello@2gofindz.com'
    );
  });

  it('shows an honest message when no contact email is configured', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    render(
      <MemoryRouter>
        <ContactPage />
      </MemoryRouter>
    );
    expect(await screen.findByText(/hasn't been configured yet/i)).toBeInTheDocument();
  });
});
```

```jsx
// frontend/src/pages/PrivacyPolicyPage.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PrivacyPolicyPage from './PrivacyPolicyPage.jsx';

describe('PrivacyPolicyPage', () => {
  it('renders the Privacy Policy heading and real content', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicyPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText(/anonymous session identifier/i)).toBeInTheDocument();
  });
});
```

```jsx
// frontend/src/pages/TermsOfUsePage.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import TermsOfUsePage from './TermsOfUsePage.jsx';

describe('TermsOfUsePage', () => {
  it('renders the Terms of Use heading and real content', () => {
    render(
      <MemoryRouter>
        <TermsOfUsePage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Terms of Use' })).toBeInTheDocument();
    expect(screen.getByText(/not affiliated with, endorsed by, or sponsored by amazon/i)).toBeInTheDocument();
  });
});
```

```jsx
// frontend/src/pages/AffiliateDisclosurePage.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AffiliateDisclosurePage from './AffiliateDisclosurePage.jsx';
import * as settingsService from '../services/settingsService.js';

describe('AffiliateDisclosurePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the configured affiliate disclosure text', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ affiliateDisclosure: 'Custom disclosure copy.' });
    render(
      <MemoryRouter>
        <AffiliateDisclosurePage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Custom disclosure copy.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/pages/AboutPage.test.jsx src/pages/ContactPage.test.jsx src/pages/PrivacyPolicyPage.test.jsx src/pages/TermsOfUsePage.test.jsx src/pages/AffiliateDisclosurePage.test.jsx`
Expected: FAIL — none of the 5 page modules exist yet.

- [ ] **Step 7: Implement the 5 pages**

```jsx
// frontend/src/pages/AboutPage.jsx
import StaticPageLayout from '../components/StaticPageLayout.jsx';

function AboutPage() {
  return (
    <StaticPageLayout title="About Us">
      <p>
        2Go Findz is a curated Amazon affiliate storefront. We spend the time browsing, comparing, and
        testing categories so you don&apos;t have to — surfacing trending finds, everyday essentials,
        and genuinely useful products worth your attention.
      </p>
      <p>
        Every product on this site links directly to its listing on Amazon. As an Amazon Associate,
        2Go Findz may earn from qualifying purchases made through those links, at no extra cost to you.
      </p>
    </StaticPageLayout>
  );
}

export default AboutPage;
```

```jsx
// frontend/src/pages/ContactPage.jsx
import { useEffect, useState } from 'react';
import StaticPageLayout from '../components/StaticPageLayout.jsx';
import { getSettings } from '../services/settingsService.js';

function ContactPage() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  return (
    <StaticPageLayout title="Contact Us">
      <p>Have a question about a product, a partnership, or this site? We&apos;d love to hear from you.</p>
      {settings?.contactEmail ? (
        <p>
          Reach us at{' '}
          <a href={`mailto:${settings.contactEmail}`} className="text-primary hover:underline">
            {settings.contactEmail}
          </a>
          .
        </p>
      ) : (
        <p>A contact email hasn&apos;t been configured yet — please check back soon.</p>
      )}
    </StaticPageLayout>
  );
}

export default ContactPage;
```

```jsx
// frontend/src/pages/PrivacyPolicyPage.jsx
import StaticPageLayout from '../components/StaticPageLayout.jsx';

function PrivacyPolicyPage() {
  return (
    <StaticPageLayout title="Privacy Policy">
      <p>
        2Go Findz does not require an account or collect personal information to browse this site. We
        use a temporary, anonymous session identifier stored in your browser to understand which
        products are viewed and clicked, so we can improve the recommendations we show.
      </p>
      <p>
        When you follow a product link, you leave 2Go Findz and are subject to Amazon&apos;s own
        privacy policy. We do not control, and are not responsible for, data collected on Amazon or any
        other third-party site.
      </p>
      <p>We do not sell or share any information we collect with third parties.</p>
    </StaticPageLayout>
  );
}

export default PrivacyPolicyPage;
```

```jsx
// frontend/src/pages/TermsOfUsePage.jsx
import StaticPageLayout from '../components/StaticPageLayout.jsx';

function TermsOfUsePage() {
  return (
    <StaticPageLayout title="Terms of Use">
      <p>
        By using 2Go Findz, you agree to use this site for its intended purpose: discovering and
        comparing products. Content on this site, including product selections and descriptions, is
        provided for informational purposes and may change without notice.
      </p>
      <p>
        Product prices, availability, and details are controlled by Amazon and may differ from what is
        shown here at the time you visit a product&apos;s Amazon listing.
      </p>
      <p>
        2Go Findz is not affiliated with, endorsed by, or sponsored by Amazon beyond its participation
        in the Amazon Associates affiliate program.
      </p>
    </StaticPageLayout>
  );
}

export default TermsOfUsePage;
```

```jsx
// frontend/src/pages/AffiliateDisclosurePage.jsx
import { useEffect, useState } from 'react';
import StaticPageLayout from '../components/StaticPageLayout.jsx';
import AffiliateDisclosure from '../components/AffiliateDisclosure.jsx';
import { getSettings } from '../services/settingsService.js';

function AffiliateDisclosurePage() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  return (
    <StaticPageLayout title="Affiliate Disclosure">
      <AffiliateDisclosure text={settings?.affiliateDisclosure} className="text-small leading-relaxed text-body" />
    </StaticPageLayout>
  );
}

export default AffiliateDisclosurePage;
```

- [ ] **Step 8: Add the routes**

In `App.jsx`, add imports near the other page imports:

```jsx
import AboutPage from './pages/AboutPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx';
import TermsOfUsePage from './pages/TermsOfUsePage.jsx';
import AffiliateDisclosurePage from './pages/AffiliateDisclosurePage.jsx';
```

Add the routes inside `<Routes>`, right after the `/products` route added in Task 21:

```jsx
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms-of-use" element={<TermsOfUsePage />} />
                <Route path="/affiliate-disclosure" element={<AffiliateDisclosurePage />} />
```

In `App.test.jsx`, add:

```jsx
  it('renders the about page at /about', () => {
    window.history.pushState({}, '', '/about');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'About Us' })).toBeInTheDocument();
  });
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/pages/AboutPage.test.jsx src/pages/ContactPage.test.jsx src/pages/PrivacyPolicyPage.test.jsx src/pages/TermsOfUsePage.test.jsx src/pages/AffiliateDisclosurePage.test.jsx src/App.test.jsx`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/StaticPageLayout.jsx frontend/src/components/StaticPageLayout.test.jsx \
        frontend/src/pages/AboutPage.jsx frontend/src/pages/AboutPage.test.jsx \
        frontend/src/pages/ContactPage.jsx frontend/src/pages/ContactPage.test.jsx \
        frontend/src/pages/PrivacyPolicyPage.jsx frontend/src/pages/PrivacyPolicyPage.test.jsx \
        frontend/src/pages/TermsOfUsePage.jsx frontend/src/pages/TermsOfUsePage.test.jsx \
        frontend/src/pages/AffiliateDisclosurePage.jsx frontend/src/pages/AffiliateDisclosurePage.test.jsx \
        frontend/src/App.jsx frontend/src/App.test.jsx
git commit -m "feat(pages): add About, Contact, Privacy Policy, Terms of Use, and Affiliate Disclosure pages"
```

---

## Task 24: Navbar dark restyle + real search

**Files:**
- Modify: `frontend/src/components/Navbar.jsx`
- Modify: `frontend/src/components/Navbar.test.jsx`

**Interfaces:**
- Produces: search form submits to `/products?search=<query>` (real navigation via `useNavigate`), nav items reduced to Home/Trending/Categories/Compare/Buying Guides.

- [ ] **Step 1: Write the failing tests**

Replace `Navbar.test.jsx` in full:

```jsx
// frontend/src/components/Navbar.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Navbar from './Navbar.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as categoryService from '../services/categoryService.js';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderNavbar(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CompareProvider>
        <Navbar />
        <Routes>
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([{ id: 1, productCategoryName: 'Electronics' }]);
  });

  it('renders the main nav links', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trending' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compare' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buying Guides' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Categories' })).toBeInTheDocument();
  });

  it('no longer renders Best Sellers or Comparisons in the nav', () => {
    renderNavbar();
    expect(screen.queryByRole('link', { name: 'Best Sellers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Comparisons' })).not.toBeInTheDocument();
  });

  it('highlights the active route in white', () => {
    renderNavbar(['/trending']);
    expect(screen.getByRole('link', { name: 'Trending' })).toHaveClass('text-white');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveClass('text-white');
  });

  it('opens the categories dropdown and lists fetched categories', async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole('button', { name: 'Categories' }));

    expect(await screen.findByRole('menuitem', { name: 'Electronics' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'All Categories' })).toHaveAttribute('href', '/categories');
    expect(screen.getByRole('menuitem', { name: 'Electronics' })).toHaveAttribute('href', '/categories?category=1');
  });

  it('closes the categories dropdown on outside click', async () => {
    const user = userEvent.setup();
    renderNavbar();
    await user.click(screen.getByRole('button', { name: 'Categories' }));
    await screen.findByRole('menuitem', { name: 'Electronics' });

    await user.click(document.body);

    await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Electronics' })).not.toBeInTheDocument());
  });

  it('opens the mobile menu when the hamburger button is clicked', async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getAllByRole('link', { name: 'Trending' }).length).toBeGreaterThan(1);
  });

  it('navigates to /products with the typed query when search is submitted', async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.type(screen.getByLabelText('Search products'), 'wireless earbuds');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/products?search=wireless%20earbuds');
  });

  it('navigates to /products with no query when search is submitted empty', async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/products');
  });

  it('hides the header when printing', () => {
    renderNavbar();
    expect(screen.getByRole('banner')).toHaveClass('print:hidden');
  });

  it('shows no compare count badge when nothing is selected', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: 'Compare' })).not.toHaveTextContent(/\d/);
  });

  it('shows the compare count badge once products are selected', () => {
    localStorage.setItem('compareProductIds', JSON.stringify([1, 2]));
    renderNavbar();
    expect(screen.getByRole('link', { name: /compare/i })).toHaveTextContent('2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/Navbar.test.jsx`
Expected: FAIL — current `Navbar.jsx` still renders Best Sellers/Comparisons links, light classes, and an icon-link instead of a search form.

- [ ] **Step 3: Implement**

Replace `Navbar.jsx` in full:

```jsx
// frontend/src/components/Navbar.jsx
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, Search } from 'lucide-react';
import logo from '../assets/2gofindz.png';
import MobileMenu from './MobileMenu.jsx';
import Badge from './Badge.jsx';
import { getCategories } from '../services/categoryService.js';
import { useCompare } from '../hooks/useCompare.js';

const navLinkClassName = ({ isActive }) =>
  `text-nav transition ${isActive ? 'text-white' : 'text-white/70 hover:text-white'}`;

function Navbar() {
  const { ids } = useCompare();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const categoriesRef = useRef(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!isCategoriesOpen) return undefined;

    function handleClickOutside(event) {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target)) {
        setIsCategoriesOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsCategoriesOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoriesOpen]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    const trimmed = searchValue.trim();
    navigate(trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : '/products');
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-navy-950 shadow-navbar print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="2Go Findz home">
            <img src={logo} alt="2Go Findz" className="h-10 w-10" />
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
            <NavLink to="/" end className={navLinkClassName}>
              Home
            </NavLink>
            <NavLink to="/trending" className={navLinkClassName}>
              Trending
            </NavLink>
            <div ref={categoriesRef} className="relative">
              <button
                type="button"
                onClick={() => setIsCategoriesOpen((open) => !open)}
                aria-expanded={isCategoriesOpen}
                aria-haspopup="menu"
                className="flex items-center gap-1 text-nav text-white/70 transition hover:text-white"
              >
                Categories
                <ChevronDown size={16} />
              </button>
              {isCategoriesOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full mt-2 w-56 rounded-card border border-slate-200 bg-white py-2 shadow-dropdown"
                >
                  <Link
                    to="/categories"
                    role="menuitem"
                    onClick={() => setIsCategoriesOpen(false)}
                    className="block px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                  >
                    All Categories
                  </Link>
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      to={`/categories?category=${category.id}`}
                      role="menuitem"
                      onClick={() => setIsCategoriesOpen(false)}
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {category.productCategoryName}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <NavLink to="/compare" className={navLinkClassName}>
              Compare
              {ids.length > 0 && <Badge>{ids.length}</Badge>}
            </NavLink>
            <NavLink to="/buying-guides" className={navLinkClassName}>
              Buying Guides
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} role="search" className="relative hidden sm:block">
              <button
                type="submit"
                aria-label="Search"
                className="absolute left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-white/50 hover:text-white"
              >
                <Search size={16} aria-hidden="true" />
              </button>
              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="w-40 rounded-search border border-white/20 bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-white lg:w-56"
              />
            </form>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
              className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} compareCount={ids.length} />
    </>
  );
}

export default Navbar;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/Navbar.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Navbar.jsx frontend/src/components/Navbar.test.jsx
git commit -m "feat(navbar): dark navy restyle with a real search form, drop Best Sellers/Comparisons"
```

---

## Task 25: MobileMenu focus trap + updated nav list

**Files:**
- Modify: `frontend/src/components/MobileMenu.jsx`
- Modify: `frontend/src/components/MobileMenu.test.jsx`

**Interfaces:**
- Consumes: nothing new. Produces the same `MobileMenu({ isOpen, onClose, compareCount })` signature Navbar (Task 24) already calls.

- [ ] **Step 1: Write the failing tests**

Replace `MobileMenu.test.jsx` in full:

```jsx
// frontend/src/components/MobileMenu.test.jsx
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import MobileMenu from './MobileMenu.jsx';

function Harness({ isOpen, onClose }) {
  return (
    <MemoryRouter>
      <button type="button">Open menu</button>
      <MobileMenu isOpen={isOpen} onClose={onClose} />
    </MemoryRouter>
  );
}

describe('MobileMenu', () => {
  it('renders the updated nav item list', () => {
    render(<Harness isOpen onClose={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trending' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Categories' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compare' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buying Guides' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Best Sellers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Comparisons' })).not.toBeInTheDocument();
  });

  it('links Search to the real /products catalog', () => {
    render(<Harness isOpen onClose={vi.fn()} />);
    expect(screen.getByRole('link', { name: /search/i })).toHaveAttribute('href', '/products');
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<Harness isOpen onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('moves focus into the drawer when opened', () => {
    render(<Harness isOpen onClose={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveFocus();
  });

  it('traps Tab focus within the drawer', () => {
    render(<Harness isOpen onClose={vi.fn()} />);
    const focusable = screen.getAllByRole('link');
    focusable[focusable.length - 1].focus();

    fireEvent.keyDown(document, { key: 'Tab' });

    expect(focusable[0]).toHaveFocus();
  });

  it('traps Shift+Tab focus within the drawer', () => {
    render(<Harness isOpen onClose={vi.fn()} />);
    const focusable = screen.getAllByRole('link');
    focusable[0].focus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(focusable[focusable.length - 1]).toHaveFocus();
  });

  it('restores focus to the previously focused trigger element on close', () => {
    const { rerender } = render(<Harness isOpen={false} onClose={vi.fn()} />);
    screen.getByRole('button', { name: 'Open menu' }).focus();
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();

    rerender(<Harness isOpen onClose={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveFocus();

    rerender(<Harness isOpen={false} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/MobileMenu.test.jsx`
Expected: FAIL — current `MobileMenu.jsx` has no focus management, still lists Best Sellers/Comparisons, and its Search link points to `/#catalog`.

- [ ] **Step 3: Implement**

Replace `MobileMenu.jsx` in full:

```jsx
// frontend/src/components/MobileMenu.jsx
import { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Badge from './Badge.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/trending', label: 'Trending' },
  { to: '/categories', label: 'Categories' },
  { to: '/compare', label: 'Compare' },
  { to: '/buying-guides', label: 'Buying Guides' },
];

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function MobileMenu({ isOpen, onClose, compareCount = 0 }) {
  const panelRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    previouslyFocusedRef.current = document.activeElement;
    const panel = panelRef.current;
    const focusableElements = panel ? Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)) : [];
    focusableElements[0]?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Site navigation">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        ref={panelRef}
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'tween', duration: 0.2 }}
        className="absolute inset-y-0 left-0 w-64 bg-white"
      >
        <nav aria-label="Site navigation" className="flex h-full flex-col px-3 py-6">
          <ul className="flex-1 space-y-1">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center rounded-md px-3 py-2 text-nav transition ${
                      isActive ? 'bg-primary/5 text-primary' : 'text-body hover:bg-slate-100'
                    }`
                  }
                >
                  {label}
                  {to === '/compare' && compareCount > 0 && <Badge>{compareCount}</Badge>}
                </NavLink>
              </li>
            ))}
            <li>
              <Link
                to="/products"
                onClick={onClose}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Search size={16} />
                Search
              </Link>
            </li>
          </ul>
        </nav>
      </motion.div>
    </div>
  );
}

export default MobileMenu;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/MobileMenu.test.jsx`
Expected: PASS

- [ ] **Step 5: Run Navbar's tests too (it mounts MobileMenu)**

Run: `cd frontend && npx vitest run src/components/Navbar.test.jsx src/components/MobileMenu.test.jsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/MobileMenu.jsx frontend/src/components/MobileMenu.test.jsx
git commit -m "feat(navbar): add focus trap/restore to MobileMenu, update nav list and search link"
```

---

## Task 26: Rebuild `HomePage.jsx`, delete `HeroSection.jsx`

**Files:**
- Modify: `frontend/src/pages/HomePage.jsx`
- Modify: `frontend/src/pages/HomePage.test.jsx`
- Delete: `frontend/src/components/HeroSection.jsx`
- Delete: `frontend/src/components/HeroSection.test.jsx`

**Interfaces:**
- Consumes: every component built in Tasks 6–20 (`HomeHero`, `SocialMediaStrip`, `HomeSectionCard`, `ProductCarousel`, `TrendingRightNowSection`, `BestSellersSection`, `CategoryGridSection`, `BrowseProductsBanner`, `PublicFooter`), plus existing `Navbar`, `getSettings`, `getCategories`, `searchProducts`, `recordView`.

- [ ] **Step 1: Write the failing tests**

Replace `HomePage.test.jsx` in full:

```jsx
// frontend/src/pages/HomePage.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import HomePage from './HomePage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';
import * as trackingService from '../services/trackingService.js';

const settings = {
  heroHeadline: 'Smart Finds. Better Buys. All in One Place.',
  heroDescription: 'Discover trending Amazon products.',
  affiliateDisclosure: 'As an Amazon Associate, 2Go Findz may earn from qualifying purchases.',
  tiktokUrl: 'https://tiktok.com/@2gofindz',
};

const categories = [{ id: 1, productCategoryName: 'Electronics' }];

const product = {
  id: 1,
  name: 'Wireless Earbuds',
  description: 'Compact wireless earbuds.',
  categoryId: 1,
  categoryName: 'Electronics',
  imageFileName: null,
  productPrice: '49.99',
  productLink: 'https://amazon.com/dp/example',
  trending: true,
  bestSeller: true,
  active: true,
  createdAt: '2026-07-20T10:00:00',
};

function renderHomePage(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CompareProvider>
        <HomePage />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(settings);
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(categories);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [product],
      totalPages: 1,
      totalElements: 1,
    });
    vi.spyOn(trackingService, 'recordView').mockResolvedValue({ sessionId: 'session-abc' });
  });

  it('renders the hero headline as the single h1', async () => {
    renderHomePage();
    expect(await screen.findByRole('heading', { level: 1, name: settings.heroHeadline })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders the section headings in the reference order', async () => {
    renderHomePage();

    await waitFor(() => {
      const sectionHeadings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
      expect(sectionHeadings).toEqual([
        'Featured Products',
        'Trending Right Now',
        'Best Sellers',
        'Shop by Category',
      ]);
    });
  });

  it('renders the social strip from settings', async () => {
    renderHomePage();
    expect(await screen.findByRole('link', { name: /tiktok/i })).toHaveAttribute('href', settings.tiktokUrl);
  });

  it('renders fetched products inside the Featured Products carousel', async () => {
    renderHomePage();
    await waitFor(() => expect(screen.getAllByText('Wireless Earbuds').length).toBeGreaterThan(0));
  });

  it('renders the Browse All Products banner linking to /products', async () => {
    renderHomePage();
    expect(await screen.findByRole('link', { name: 'Browse All Products' })).toHaveAttribute('href', '/products');
  });

  it('records a website view exactly once per session on mount', async () => {
    renderHomePage();
    await waitFor(() => expect(trackingService.recordView).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem('sessionId')).toBe('session-abc');
  });

  it('does not record a second view when a session already exists', async () => {
    sessionStorage.setItem('sessionId', 'existing-session');
    renderHomePage();

    await screen.findByRole('heading', { level: 1, name: settings.heroHeadline });
    expect(trackingService.recordView).not.toHaveBeenCalled();
  });

  it('renders the affiliate disclosure in the footer', async () => {
    renderHomePage();
    expect(await screen.findByText(settings.affiliateDisclosure)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/HomePage.test.jsx`
Expected: FAIL — current `HomePage.jsx` still renders the old 11-section layout with `ProductGrid` teasers, no `HomeSectionCard` h2s in this order, no carousel, no `/products` banner link.

- [ ] **Step 3: Implement**

Replace `HomePage.jsx` in full:

```jsx
// frontend/src/pages/HomePage.jsx
import { useEffect, useState } from 'react';
import { Award, Flame, LayoutGrid, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import PublicFooter from '../components/PublicFooter.jsx';
import HomeHero from '../components/home/HomeHero.jsx';
import SocialMediaStrip from '../components/home/SocialMediaStrip.jsx';
import HomeSectionCard from '../components/home/HomeSectionCard.jsx';
import ProductCarousel from '../components/home/ProductCarousel.jsx';
import TrendingRightNowSection from '../components/home/TrendingRightNowSection.jsx';
import BestSellersSection from '../components/home/BestSellersSection.jsx';
import CategoryGridSection from '../components/home/CategoryGridSection.jsx';
import BrowseProductsBanner from '../components/home/BrowseProductsBanner.jsx';
import { getSettings } from '../services/settingsService.js';
import { getCategories } from '../services/categoryService.js';
import { searchProducts } from '../services/productService.js';
import { recordView } from '../services/trackingService.js';

function useTeaserProducts(params) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    searchProducts({ ...params, page: 0, size: 8 })
      .then((data) => {
        if (!isCancelled) setProducts(data.content);
      })
      .catch(() => {
        if (!isCancelled) setProducts([]);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });
    return () => {
      isCancelled = true;
    };
    // params is a stable literal passed by the caller at each call site; re-running this
    // effect only on mount is intentional for a homepage teaser section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { products, isLoading };
}

function HomePage() {
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const featured = useTeaserProducts({ sort: 'createdAt,desc' });
  const trending = useTeaserProducts({ trending: true, sort: 'createdAt,desc' });
  const bestSellers = useTeaserProducts({ bestSeller: true, sort: 'createdAt,desc' });

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem('sessionId')) {
      recordView()
        .then(({ sessionId }) => sessionStorage.setItem('sessionId', sessionId))
        .catch(() => {
          // View tracking is best-effort; never block page rendering on it.
        });
    }
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <HomeHero
        headline={settings?.heroHeadline ?? 'Smart Finds. Better Buys. All in One Place.'}
        description={
          settings?.heroDescription ??
          'Discover trending Amazon products, everyday essentials, affordable finds, and must-have items carefully selected to help you shop smarter.'
        }
      />

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SocialMediaStrip settings={settings} />
        </div>
      </section>

      {featured.products.length > 0 && (
        <section className="bg-surface-secondary py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <HomeSectionCard
              icon={Sparkles}
              title="Featured Products"
              description="Hand-picked finds worth a closer look."
              viewAllHref="/products"
            >
              <ProductCarousel products={featured.products} />
            </HomeSectionCard>
          </div>
        </section>
      )}

      {(trending.products.length > 0 || bestSellers.products.length > 0) && (
        <section className="py-24">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            {trending.products.length > 0 && (
              <HomeSectionCard
                icon={Flame}
                title="Trending Right Now"
                description="What everyone's buying."
                viewAllHref="/trending"
              >
                <TrendingRightNowSection products={trending.products} />
              </HomeSectionCard>
            )}
            {bestSellers.products.length > 0 && (
              <HomeSectionCard
                icon={Award}
                title="Best Sellers"
                description="Our most popular picks."
                viewAllHref="/best-sellers"
              >
                <BestSellersSection products={bestSellers.products} />
              </HomeSectionCard>
            )}
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="bg-surface-secondary py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <HomeSectionCard
              icon={LayoutGrid}
              title="Shop by Category"
              description="Browse curated recommendations by category."
              viewAllHref="/categories"
            >
              <CategoryGridSection categories={categories} />
            </HomeSectionCard>
          </div>
        </section>
      )}

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <BrowseProductsBanner />
        </div>
      </section>

      <PublicFooter settings={settings} />
    </div>
  );
}

export default HomePage;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/HomePage.test.jsx`
Expected: PASS

- [ ] **Step 5: Delete the now-unused `HeroSection.jsx`**

Confirm no remaining references first:

Run: `grep -rl "HeroSection" frontend/src`
Expected: no output.

```bash
rm frontend/src/components/HeroSection.jsx frontend/src/components/HeroSection.test.jsx
```

- [ ] **Step 6: Run the full frontend test suite, lint, and production build**

Run:
```bash
cd frontend
npx vitest run
npm run lint
npm run build
```
Expected: all PASS with zero errors/warnings.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/HomePage.jsx frontend/src/pages/HomePage.test.jsx
git rm frontend/src/components/HeroSection.jsx frontend/src/components/HeroSection.test.jsx
git commit -m "feat(homepage): rebuild HomePage to the reference's 8-section order"
```

---

## Final verification (after all 26 tasks)

- [ ] **Frontend:** `cd frontend && npx vitest run && npm run lint && npm run build`
- [ ] **Backend:** `cd backend && mvn test` (with `DOCKER_HOST`/`TESTCONTAINERS_RYUK_DISABLED` set for Colima, and `set -a; source .env; set +a` if running the server manually)
- [ ] **Manual browser verification** (Chrome DevTools MCP) at 1536/1440/1280/1024/768/390/375px:
  - Compare the homepage against the reference image at desktop width; iterate on spacing/typography/radii/shadows/icon sizes per the design doc's visual-accuracy workflow until they match as closely as the existing application permits.
  - Verify: navbar search submits and lands on `/products` with the query pre-filled; mobile menu opens, traps focus, and restores focus on close; carousel arrows scroll and disable at the boundaries; category cards, trending/best-seller rows, and footer links all navigate to real routes; newsletter form shows the honest unavailable message; social strip shows only configured platforms; no page-level horizontal overflow at any breakpoint.
  - Spot-check `/products`, `/trending`, `/best-sellers`, `/categories`, `/compare`, `/buying-guides`, `/comparisons`, `/about`, `/contact`, `/privacy-policy`, `/terms-of-use`, `/affiliate-disclosure` all render with the new dark navbar/footer and no console errors.
- [ ] Once verified, proceed to `superpowers:finishing-a-development-branch`.
