# Design System Stage 10: Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retokenize `SettingsPage.jsx` — the final file in the "2Go Findz" UI/UX redesign — onto the design tokens established in Stages 1–9, with zero behavior change.

**Architecture:** Pure presentation changes — swap ad-hoc Tailwind classes (`slate-*`, `indigo-*`, `red-*`, `rounded-md`) for the project's design tokens, plus one structural enhancement: wrap each of the page's 4 bare `<section>` elements in the card treatment (`bg-white rounded-card shadow-card p-6`) already used everywhere else in the admin (`DataTable`, `Modal`, `DashboardPage`'s cards).

**Tech Stack:** React, Tailwind CSS, Vitest, React Testing Library.

## Global Constraints

- Every text/textarea form input uses `border-border`, `rounded-btn`, `focus:border-primary`, `focus:outline-none`, `focus:ring-2`, `focus:ring-primary`.
- Every form label (including `ImageUploader` labels) uses `text-small font-medium text-body`.
- Every field-level error uses `text-danger`; the form-level error banner uses `bg-danger/10 text-danger`.
- The page `<h1>` uses `text-page-heading text-heading`; each section `<h2>` uses `text-card-title text-heading`.
- Each of the 4 `<section>` elements is wrapped in `bg-white rounded-card shadow-card p-6`.
- No change to any validation logic, load/save request shape, or existing test assertions (`SettingsPage.test.jsx`'s 9 tests query by role/label/text, never class name — verified during planning).

---

### Task 1: Retokenize SettingsPage

**Files:**
- Modify: `frontend/src/pages/admin/SettingsPage.jsx`

**Interfaces:**
- Consumes: `Button` component (`type="submit"`, default `variant="primary"`), already used throughout the admin since Stage 7.

No test changes — verified during planning that `SettingsPage.test.jsx` (9 tests) queries by role/label/text only.

- [ ] **Step 1: Add the `Button` import**

```jsx
import Button from '../../components/Button.jsx';
```

- [ ] **Step 2: Retokenize the page heading and form-level error banner**

Change:

```jsx
      <h1 className="mb-6 text-2xl font-bold text-slate-900">System Settings</h1>

      <form onSubmit={handleSubmit} noValidate className="max-w-2xl space-y-10">
        {formError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}
```

to:

```jsx
      <h1 className="mb-6 text-page-heading text-heading">System Settings</h1>

      <form onSubmit={handleSubmit} noValidate className="max-w-2xl space-y-10">
        {formError && (
          <p role="alert" className="rounded-btn bg-danger/10 px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}
```

- [ ] **Step 3: Wrap the "Branding & Hero Images" section in a card and retokenize its labels**

Change:

```jsx
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Branding &amp; Hero Images</h2>
          <div className="space-y-6">
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Logo</span>
              <ImageUploader
                imageFileName={settings.logoImageFilename}
                onChange={(filename) => handleChange('logoImageFilename', filename)}
              />
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Hero Image</span>
              <ImageUploader
                imageFileName={settings.heroImageFilename}
                onChange={(filename) => handleChange('heroImageFilename', filename)}
              />
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Product Placeholder Image</span>
              <ImageUploader
                imageFileName={settings.placeholderImageFilename}
                onChange={(filename) => handleChange('placeholderImageFilename', filename)}
              />
            </div>
          </div>
        </section>
```

to:

```jsx
        <section className="rounded-card bg-white p-6 shadow-card">
          <h2 className="mb-4 text-card-title text-heading">Branding &amp; Hero Images</h2>
          <div className="space-y-6">
            <div>
              <span className="mb-1 block text-small font-medium text-body">Logo</span>
              <ImageUploader
                imageFileName={settings.logoImageFilename}
                onChange={(filename) => handleChange('logoImageFilename', filename)}
              />
            </div>
            <div>
              <span className="mb-1 block text-small font-medium text-body">Hero Image</span>
              <ImageUploader
                imageFileName={settings.heroImageFilename}
                onChange={(filename) => handleChange('heroImageFilename', filename)}
              />
            </div>
            <div>
              <span className="mb-1 block text-small font-medium text-body">Product Placeholder Image</span>
              <ImageUploader
                imageFileName={settings.placeholderImageFilename}
                onChange={(filename) => handleChange('placeholderImageFilename', filename)}
              />
            </div>
          </div>
        </section>
```

- [ ] **Step 4: Wrap the "Hero Content" section in a card and retokenize its fields**

Change:

```jsx
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Hero Content</h2>
          <div className="mb-4">
            <label htmlFor="heroHeadline" className="mb-1 block text-sm font-medium text-slate-700">
              Hero Headline
            </label>
            <input
              id="heroHeadline"
              type="text"
              value={settings.heroHeadline}
              onChange={(event) => handleChange('heroHeadline', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="heroDescription" className="mb-1 block text-sm font-medium text-slate-700">
              Hero Description
            </label>
            <textarea
              id="heroDescription"
              rows={3}
              value={settings.heroDescription}
              onChange={(event) => handleChange('heroDescription', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </section>
```

to:

```jsx
        <section className="rounded-card bg-white p-6 shadow-card">
          <h2 className="mb-4 text-card-title text-heading">Hero Content</h2>
          <div className="mb-4">
            <label htmlFor="heroHeadline" className="mb-1 block text-small font-medium text-body">
              Hero Headline
            </label>
            <input
              id="heroHeadline"
              type="text"
              value={settings.heroHeadline}
              onChange={(event) => handleChange('heroHeadline', event.target.value)}
              className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="heroDescription" className="mb-1 block text-small font-medium text-body">
              Hero Description
            </label>
            <textarea
              id="heroDescription"
              rows={3}
              value={settings.heroDescription}
              onChange={(event) => handleChange('heroDescription', event.target.value)}
              className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </section>
```

- [ ] **Step 5: Wrap the "Social Links" section in a card and retokenize its fields**

Change:

```jsx
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Social Links</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tiktokUrl" className="mb-1 block text-sm font-medium text-slate-700">
                TikTok URL
              </label>
              <input
                id="tiktokUrl"
                type="text"
                value={settings.tiktokUrl}
                onChange={(event) => handleChange('tiktokUrl', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="pinterestUrl" className="mb-1 block text-sm font-medium text-slate-700">
                Pinterest URL
              </label>
              <input
                id="pinterestUrl"
                type="text"
                value={settings.pinterestUrl}
                onChange={(event) => handleChange('pinterestUrl', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="instagramUrl" className="mb-1 block text-sm font-medium text-slate-700">
                Instagram URL
              </label>
              <input
                id="instagramUrl"
                type="text"
                value={settings.instagramUrl}
                onChange={(event) => handleChange('instagramUrl', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="youtubeUrl" className="mb-1 block text-sm font-medium text-slate-700">
                YouTube URL
              </label>
              <input
                id="youtubeUrl"
                type="text"
                value={settings.youtubeUrl}
                onChange={(event) => handleChange('youtubeUrl', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </section>
```

to:

```jsx
        <section className="rounded-card bg-white p-6 shadow-card">
          <h2 className="mb-4 text-card-title text-heading">Social Links</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tiktokUrl" className="mb-1 block text-small font-medium text-body">
                TikTok URL
              </label>
              <input
                id="tiktokUrl"
                type="text"
                value={settings.tiktokUrl}
                onChange={(event) => handleChange('tiktokUrl', event.target.value)}
                className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="pinterestUrl" className="mb-1 block text-small font-medium text-body">
                Pinterest URL
              </label>
              <input
                id="pinterestUrl"
                type="text"
                value={settings.pinterestUrl}
                onChange={(event) => handleChange('pinterestUrl', event.target.value)}
                className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="instagramUrl" className="mb-1 block text-small font-medium text-body">
                Instagram URL
              </label>
              <input
                id="instagramUrl"
                type="text"
                value={settings.instagramUrl}
                onChange={(event) => handleChange('instagramUrl', event.target.value)}
                className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="youtubeUrl" className="mb-1 block text-small font-medium text-body">
                YouTube URL
              </label>
              <input
                id="youtubeUrl"
                type="text"
                value={settings.youtubeUrl}
                onChange={(event) => handleChange('youtubeUrl', event.target.value)}
                className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </section>
```

- [ ] **Step 6: Wrap the "Shop Info & Disclosure" section in a card and retokenize its fields**

Change:

```jsx
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Shop Info &amp; Disclosure</h2>
          <div className="mb-4">
            <label htmlFor="shopBio" className="mb-1 block text-sm font-medium text-slate-700">
              Shop Bio
            </label>
            <textarea
              id="shopBio"
              rows={3}
              value={settings.shopBio}
              onChange={(event) => handleChange('shopBio', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="affiliateDisclosure" className="mb-1 block text-sm font-medium text-slate-700">
              Affiliate Disclosure
            </label>
            <textarea
              id="affiliateDisclosure"
              rows={3}
              value={settings.affiliateDisclosure}
              onChange={(event) => handleChange('affiliateDisclosure', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-invalid={Boolean(fieldErrors.affiliateDisclosure)}
              aria-describedby={fieldErrors.affiliateDisclosure ? 'affiliateDisclosure-error' : undefined}
            />
            {fieldErrors.affiliateDisclosure && (
              <p id="affiliateDisclosure-error" className="mt-1 text-sm text-red-600">
                {fieldErrors.affiliateDisclosure}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="contactEmail" className="mb-1 block text-sm font-medium text-slate-700">
              Contact Email
            </label>
            <input
              id="contactEmail"
              type="text"
              value={settings.contactEmail}
              onChange={(event) => handleChange('contactEmail', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-invalid={Boolean(fieldErrors.contactEmail)}
              aria-describedby={fieldErrors.contactEmail ? 'contactEmail-error' : undefined}
            />
            {fieldErrors.contactEmail && (
              <p id="contactEmail-error" className="mt-1 text-sm text-red-600">
                {fieldErrors.contactEmail}
              </p>
            )}
          </div>
        </section>
```

to:

```jsx
        <section className="rounded-card bg-white p-6 shadow-card">
          <h2 className="mb-4 text-card-title text-heading">Shop Info &amp; Disclosure</h2>
          <div className="mb-4">
            <label htmlFor="shopBio" className="mb-1 block text-small font-medium text-body">
              Shop Bio
            </label>
            <textarea
              id="shopBio"
              rows={3}
              value={settings.shopBio}
              onChange={(event) => handleChange('shopBio', event.target.value)}
              className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="affiliateDisclosure" className="mb-1 block text-small font-medium text-body">
              Affiliate Disclosure
            </label>
            <textarea
              id="affiliateDisclosure"
              rows={3}
              value={settings.affiliateDisclosure}
              onChange={(event) => handleChange('affiliateDisclosure', event.target.value)}
              className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              aria-invalid={Boolean(fieldErrors.affiliateDisclosure)}
              aria-describedby={fieldErrors.affiliateDisclosure ? 'affiliateDisclosure-error' : undefined}
            />
            {fieldErrors.affiliateDisclosure && (
              <p id="affiliateDisclosure-error" className="mt-1 text-sm text-danger">
                {fieldErrors.affiliateDisclosure}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="contactEmail" className="mb-1 block text-small font-medium text-body">
              Contact Email
            </label>
            <input
              id="contactEmail"
              type="text"
              value={settings.contactEmail}
              onChange={(event) => handleChange('contactEmail', event.target.value)}
              className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              aria-invalid={Boolean(fieldErrors.contactEmail)}
              aria-describedby={fieldErrors.contactEmail ? 'contactEmail-error' : undefined}
            />
            {fieldErrors.contactEmail && (
              <p id="contactEmail-error" className="mt-1 text-sm text-danger">
                {fieldErrors.contactEmail}
              </p>
            )}
          </div>
        </section>
```

- [ ] **Step 7: Replace the Save button with `Button`**

Change:

```jsx
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
```

to:

```jsx
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
```

- [ ] **Step 8: Run the SettingsPage tests**

Run: `npm test -- --run SettingsPage` (from `frontend/`)
Expected: PASS, all 9 tests in `SettingsPage.test.jsx`.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/admin/SettingsPage.jsx
git commit -m "style(admin): retokenize SettingsPage"
```

---

### Task 2: Full-suite verification and visual check

**Files:** none (verification only)

**Interfaces:** none — this task consumes the finished output of Task 1 and is the final task of the entire design system initiative (Stages 1–10).

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --run` (from `frontend/`)
Expected: PASS, 314/314 (same count as the Stage 9 baseline — no tests added or removed in this stage). If a single unrelated failure appears in the ComparisonDetailPage/CompareBar area, this is a known test-order-dependent flake seen in prior stages (not caused by this stage's changes) — re-run the suite once and confirm it passes clean before proceeding.

- [ ] **Step 2: Visual check with chrome-devtools MCP**

With the frontend dev server running (`npm run dev` from `frontend/`, if not already up), use the chrome-devtools MCP tools to navigate to `/admin/settings` and take a screenshot. Confirm: the page heading renders at the larger `text-page-heading` size; all 4 sections render as distinct white cards with rounded corners and a subtle shadow, each with a bold section subheading; all field labels, input borders, and focus states match the rest of the admin; the Save button renders as a blue `Button` component matching every other primary action in the app.

If anything looks visually wrong (unexpected colors, broken layout), fix it before proceeding — this is the final check before the entire design system initiative (Stages 1–10) is considered done.

- [ ] **Step 3: No commit needed**

This task is verification-only; nothing to commit unless Step 2 uncovers a fix, in which case commit that fix with an appropriate message before finishing.
