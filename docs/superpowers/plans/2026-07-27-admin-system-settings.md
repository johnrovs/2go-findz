# Frontend Admin Stage 3: System Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `SettingsPage` placeholder with a single-record settings form covering branding/hero images, hero content, social links, and shop info/disclosure.

**Architecture:** `SettingsPage` is one self-contained page (no list/detail split — settings is a singleton with no id). It fetches the current record on mount, holds it as one object in local state, and submits the entire object back on save (the backend has no partial-patch endpoint). Three fields reuse `ImageUploader` (Product Management stage) as-is.

**Tech Stack:** Same as prior stages — React JS/JSX, Vite, Tailwind, Axios, Vitest + React Testing Library. No new dependencies.

## Global Constraints

- Full design detail: `docs/superpowers/specs/2026-07-27-admin-system-settings-design.md`. Master spec: `docs/PROJECT_SPEC.md` §"6. System Settings".
- `SettingsRequest`/`SettingsResponse` shape (verified directly from the backend DTOs): `{ logoImageFilename, heroImageFilename, placeholderImageFilename, tiktokUrl, pinterestUrl, instagramUrl, youtubeUrl, shopBio, heroHeadline, heroDescription, affiliateDisclosure, contactEmail }`. Only `affiliateDisclosure` is required (`@NotBlank`); `contactEmail` is validated as an email format only when non-empty (`@Email`); every other field has no server-side constraint at all.
- Endpoints: `GET /api/admin/settings` → `SettingsResponse`; `PUT /api/admin/settings` (body: the full `SettingsRequest`) → `SettingsResponse`. No POST/DELETE — this is a singleton record.
- All backend calls go through the existing shared `api` Axios instance — never direct `axios`/`fetch`. Errors normalize to `{ message, fieldErrors }` via the existing `normalizeError` in `api.js`.
- Toasts use the existing `useToast()` hook.
- Reused as-is: `ImageUploader` (`frontend/src/components/ImageUploader.jsx`, Product Management stage), `LoadingSpinner`, `ErrorState`.
- Color palette matches prior stages: primary action `indigo-600`/`indigo-700`.
- TDD throughout: write the failing test, confirm RED, implement, confirm GREEN, run the full suite, commit — every task.
- Accessible by default: labeled inputs, `aria-invalid`/`aria-describedby` on validation errors, section headings as real `<h2>`s.
- Never commit `.env`.

---

### Task 1: `adminSettingsService`

**Files:**
- Create: `frontend/src/services/adminSettingsService.js`
- Test: `frontend/src/services/adminSettingsService.test.js`

**Interfaces:**
- Consumes: shared `api` Axios instance.
- Produces: `getSettings(): Promise<Settings>`, `updateSettings(payload): Promise<Settings>`. Consumed by `SettingsPage` (Task 2). Distinct from the existing public `frontend/src/services/settingsService.js` (different endpoint, different consumer — do not modify that file).

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import { getSettings, updateSettings } from './adminSettingsService.js';

describe('adminSettingsService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getSettings fetches from /admin/settings and returns the record', async () => {
    const settings = { affiliateDisclosure: 'As an Amazon Associate...', contactEmail: 'hello@2gofindz.com' };
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Settings retrieved successfully.', data: settings },
    });

    const result = await getSettings();

    expect(api.get).toHaveBeenCalledWith('/admin/settings');
    expect(result).toEqual(settings);
  });

  it('updateSettings puts the payload and returns the updated record', async () => {
    const payload = { affiliateDisclosure: 'Updated disclosure.', contactEmail: 'new@2gofindz.com' };
    vi.spyOn(api, 'put').mockResolvedValue({
      data: { success: true, message: 'Settings updated successfully.', data: payload },
    });

    const result = await updateSettings(payload);

    expect(api.put).toHaveBeenCalledWith('/admin/settings', payload);
    expect(result).toEqual(payload);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- adminSettingsService.test.js`
Expected: FAIL — `adminSettingsService.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```javascript
import api from './api.js';

export async function getSettings() {
  const response = await api.get('/admin/settings');
  return response.data.data;
}

export async function updateSettings(payload) {
  const response = await api.put('/admin/settings', payload);
  return response.data.data;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- adminSettingsService.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/adminSettingsService.js frontend/src/services/adminSettingsService.test.js
git commit -m "feat: add adminSettingsService for system settings"
```

---

### Task 2: `SettingsPage` assembly

**Files:**
- Modify: `frontend/src/pages/admin/SettingsPage.jsx` (replace the placeholder body entirely)
- Test: `frontend/src/pages/admin/SettingsPage.test.jsx`

**Interfaces:**
- Consumes: `ImageUploader` (existing, `ImageUploader({ imageFileName, onChange })`), `LoadingSpinner`, `ErrorState`, `useToast`, `getSettings`/`updateSettings` from Task 1.
- Produces: the complete `/admin/settings` route content — nothing downstream in this stage consumes `SettingsPage` itself.

**Note:** `App.jsx` already routes `/admin/settings` to `SettingsPage` (unchanged) — this task only replaces the placeholder's internal content.

- [ ] **Step 1: Write the failing test**

```jsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ToastProvider } from '../../context/ToastContext.jsx';
import SettingsPage from './SettingsPage.jsx';
import * as adminSettingsService from '../../services/adminSettingsService.js';
import * as adminImageService from '../../services/adminImageService.js';

const settings = {
  logoImageFilename: 'img_logo.webp',
  heroImageFilename: null,
  placeholderImageFilename: null,
  tiktokUrl: 'https://tiktok.com/@2gofindz',
  pinterestUrl: '',
  instagramUrl: '',
  youtubeUrl: '',
  shopBio: 'Curated Amazon finds.',
  heroHeadline: 'Smart Finds. Better Buys.',
  heroDescription: 'Discover trending products.',
  affiliateDisclosure: 'As an Amazon Associate, 2Go Findz may earn from qualifying purchases.',
  contactEmail: 'hello@2gofindz.com',
};

function renderPage() {
  return render(
    <ToastProvider>
      <SettingsPage />
    </ToastProvider>
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminSettingsService, 'getSettings').mockResolvedValue(settings);
  });

  it('loads and pre-fills the existing settings', async () => {
    renderPage();

    expect(await screen.findByLabelText('Hero Headline')).toHaveValue('Smart Finds. Better Buys.');
    expect(screen.getByLabelText('TikTok URL')).toHaveValue('https://tiktok.com/@2gofindz');
    expect(screen.getByLabelText('Contact Email')).toHaveValue('hello@2gofindz.com');
  });

  it('shows a validation error when affiliate disclosure is cleared', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText('Hero Headline');

    await user.clear(screen.getByLabelText('Affiliate Disclosure'));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Affiliate disclosure is required.')).toBeInTheDocument();
  });

  it('rejects an invalid contact email format', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText('Hero Headline');

    const emailInput = screen.getByLabelText('Contact Email');
    await user.clear(emailInput);
    await user.type(emailInput, 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Contact email must be a valid email address.')).toBeInTheDocument();
  });

  it('allows an empty contact email', async () => {
    vi.spyOn(adminSettingsService, 'updateSettings').mockResolvedValue(settings);
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText('Hero Headline');

    await user.clear(screen.getByLabelText('Contact Email'));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(adminSettingsService.updateSettings).toHaveBeenCalled());
    expect(screen.queryByText('Contact email must be a valid email address.')).not.toBeInTheDocument();
  });

  it('submits the full settings payload including untouched fields', async () => {
    vi.spyOn(adminSettingsService, 'updateSettings').mockResolvedValue(settings);
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText('Hero Headline');

    const headlineInput = screen.getByLabelText('Hero Headline');
    await user.clear(headlineInput);
    await user.type(headlineInput, 'New Headline');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(adminSettingsService.updateSettings).toHaveBeenCalledWith({
        ...settings,
        heroHeadline: 'New Headline',
      })
    );
  });

  it('uploads an image and includes the returned filename in the submit payload', async () => {
    vi.spyOn(adminImageService, 'uploadImage').mockResolvedValue({ filename: 'img_new_hero.webp' });
    vi.spyOn(adminSettingsService, 'updateSettings').mockResolvedValue(settings);
    renderPage();
    await screen.findByLabelText('Hero Headline');

    const heroUploadInput = screen.getAllByLabelText(/upload image/i)[1];
    const file = new File(['content'], 'hero.webp', { type: 'image/webp' });
    fireEvent.change(heroUploadInput, { target: { files: [file] } });

    await waitFor(() => expect(adminImageService.uploadImage).toHaveBeenCalled());

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(adminSettingsService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ heroImageFilename: 'img_new_hero.webp' })
      )
    );
  });

  it('shows a success toast after saving', async () => {
    vi.spyOn(adminSettingsService, 'updateSettings').mockResolvedValue(settings);
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText('Hero Headline');

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Settings updated successfully.')).toBeInTheDocument();
  });

  it('renders a server-side field error under the matching input', async () => {
    vi.spyOn(adminSettingsService, 'updateSettings').mockRejectedValue({
      message: 'Validation failed.',
      fieldErrors: { contactEmail: 'Contact email must be a valid email address.' },
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText('Hero Headline');

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Contact email must be a valid email address.')).toBeInTheDocument();
  });

  it('shows an error state with retry when the initial load fails', async () => {
    adminSettingsService.getSettings.mockRejectedValueOnce({ message: 'Network error. Please try again.' });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();

    adminSettingsService.getSettings.mockResolvedValueOnce(settings);
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByLabelText('Hero Headline')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- SettingsPage.test.jsx`
Expected: FAIL — the current placeholder renders none of this.

- [ ] **Step 3: Write the new `SettingsPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import ImageUploader from '../../components/ImageUploader.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { useToast } from '../../hooks/useToast.js';
import { getSettings, updateSettings } from '../../services/adminSettingsService.js';

const INITIAL_SETTINGS = {
  logoImageFilename: null,
  heroImageFilename: null,
  placeholderImageFilename: null,
  tiktokUrl: '',
  pinterestUrl: '',
  instagramUrl: '',
  youtubeUrl: '',
  shopBio: '',
  heroHeadline: '',
  heroDescription: '',
  affiliateDisclosure: '',
  contactEmail: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeSettings(data) {
  return {
    logoImageFilename: data.logoImageFilename ?? null,
    heroImageFilename: data.heroImageFilename ?? null,
    placeholderImageFilename: data.placeholderImageFilename ?? null,
    tiktokUrl: data.tiktokUrl ?? '',
    pinterestUrl: data.pinterestUrl ?? '',
    instagramUrl: data.instagramUrl ?? '',
    youtubeUrl: data.youtubeUrl ?? '',
    shopBio: data.shopBio ?? '',
    heroHeadline: data.heroHeadline ?? '',
    heroDescription: data.heroDescription ?? '',
    affiliateDisclosure: data.affiliateDisclosure ?? '',
    contactEmail: data.contactEmail ?? '',
  };
}

function SettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function load() {
    setIsLoading(true);
    setLoadError(null);
    getSettings()
      .then((data) => setSettings(normalizeSettings(data)))
      .catch((err) => setLoadError(err.message ?? 'Failed to load settings.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    // load() resets loading/error state synchronously before fetching; this is the
    // standard reset-before-async-work pattern and can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function validate() {
    const errors = {};
    if (!settings.affiliateDisclosure.trim()) {
      errors.affiliateDisclosure = 'Affiliate disclosure is required.';
    }
    if (settings.contactEmail.trim() && !EMAIL_PATTERN.test(settings.contactEmail.trim())) {
      errors.contactEmail = 'Contact email must be a valid email address.';
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
      const updated = await updateSettings(settings);
      setSettings(normalizeSettings(updated));
      showToast('Settings updated successfully.');
    } catch (error) {
      setFieldErrors(error.fieldErrors ?? {});
      if (!error.fieldErrors) {
        setFormError(error.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingSpinner label="Loading settings..." />;
  }

  if (loadError) {
    return <ErrorState message={loadError} onRetry={load} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">System Settings</h1>

      <form onSubmit={handleSubmit} noValidate className="max-w-2xl space-y-10">
        {formError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}

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

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

export default SettingsPage;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- SettingsPage.test.jsx`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/admin/SettingsPage.jsx frontend/src/pages/admin/SettingsPage.test.jsx
git commit -m "feat: assemble the system settings page with image uploads"
```

---

### Task 3: Final verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1–2
- Produces: nothing further downstream — this sub-stage's final gate.

- [ ] **Step 1: Run the entire test suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus all tests from Tasks 1 and 2.

- [ ] **Step 2: Run lint**

Run: `cd frontend && npm run lint`
Expected: clean (0 errors, 0 warnings). `SettingsPage`'s `load()` call inside its effect already carries the `react-hooks/set-state-in-effect` disable comment established in prior stages (`CategoriesPage`'s identical pattern) — if lint still flags something unanticipated, apply the same pattern with a one-line justification.

- [ ] **Step 3: Run the production build**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Manual smoke check (optional, requires the backend running and a real admin login)**

Optional — skip if a live backend isn't available; Steps 1-3 are the mandatory bar. If available: open `/admin/settings`, confirm the form loads with current values, uploading each of the three images works and previews correctly, saving with a valid form succeeds and shows a toast, clearing the affiliate disclosure blocks save with a client-side error, and an invalid contact email is caught before submission.

- [ ] **Step 5: Commit (if the smoke check surfaced any fixes)**

If Step 4 found nothing to fix (or was skipped), there is nothing to commit for this task — Task 2's commit is the final commit of this sub-stage. If it did surface a small fix, apply it, re-run Steps 1-3, and commit:
```bash
git add -A
git commit -m "fix: address issue found during Admin System Settings manual smoke check"
```
