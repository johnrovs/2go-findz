# i18n Phase 1: Frontend Foundation & Language Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `i18next` in the 2Go Findz frontend and ship a working globe-icon language selector that switches static UI text across the Navbar, MobileMenu, PublicFooter, and generic error/pagination components between English, Spanish, Filipino, Simplified Chinese, and Vietnamese — with no page reload, browser-language detection, and `localStorage` persistence.

**Architecture:** `i18next` + `react-i18next` + `i18next-browser-languagedetector`, with `i18next-resources-to-backend` wrapping dynamic `import()` so Vite code-splits each `(locale, namespace)` JSON pair into its own chunk (no eager bundling of all 5 languages, no `public/locales` static-asset serving). A small pure-function locale-alias table normalizes real-world `navigator.language` values (`es-MX`, `zh-CN`, `tl`, ...) onto our 5 non-standard launch codes before i18next's own `fallbackLng` logic takes over. Test environment gets its own **synchronous** i18n init (statically-imported en-US JSON, no backend, no detector) so existing component tests keep working unchanged against real English copy — this file does not touch the async production init at all, they are the same underlying `i18next` singleton but configured by whichever module runs `.init()` first in a given process (production: `src/i18n/index.js` via `main.jsx`; tests: `src/test/setup.js`).

**Tech Stack:** React 18.3, Vite 5.3, `react-i18next`, `i18next-browser-languagedetector`, `i18next-resources-to-backend`, Vitest 2.0, Testing Library.

## Global Constraints

- Launch locales, exact codes: `en-US` (default/fallback), `es-US`, `fil-PH`, `zh-Hans`, `vi`.
- No country flags anywhere in the selector — native-language text labels only.
- Detection priority: `localStorage` → browser language → English. `localStorage` always wins over browser detection on repeat visits.
- Language switch must be instant, with no page reload and no scroll-position or app-state reset.
- `<html lang>` must update on every language change.
- Missing translation keys must fall back to English — raw i18n keys must never render.
- No machine-placeholder translations ("translation goes here" etc.) — every string in every locale file must be a real, natural, shopper-friendly translation.
- Brand name "2Go Findz" is never translated.
- This plan does not touch: URL routing/locale prefixes, backend, admin dashboard UI chrome, or DB-driven content (Phases 2-4, separate plans).
- Spec reference: `docs/superpowers/specs/2026-08-12-i18n-frontend-foundation-design.md`.

---

### Task 1: Install dependencies and add the supported-languages config

**Files:**
- Modify: `frontend/package.json` (dependencies)
- Create: `frontend/src/i18n/supportedLanguages.js`
- Test: `frontend/src/i18n/supportedLanguages.test.js`

**Interfaces:**
- Produces: `SUPPORTED_LANGUAGES` — a `{ code: string, nativeName: string }[]` array of exactly the 5 launch locales, exported from `src/i18n/supportedLanguages.js`. Used by Task 3 (`supportedLngs` list), Task 5 (`LanguageSelector`), and Task 7 (`MobileMenu`'s inline language list).

- [ ] **Step 1: Install the i18n packages**

```bash
cd frontend
npm install i18next react-i18next i18next-browser-languagedetector i18next-resources-to-backend
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/i18n/supportedLanguages.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { SUPPORTED_LANGUAGES } from './supportedLanguages.js';

describe('SUPPORTED_LANGUAGES', () => {
  it('lists exactly the 5 launch locales with their native names', () => {
    expect(SUPPORTED_LANGUAGES).toEqual([
      { code: 'en-US', nativeName: 'English' },
      { code: 'es-US', nativeName: 'Español' },
      { code: 'fil-PH', nativeName: 'Filipino' },
      { code: 'zh-Hans', nativeName: '简体中文' },
      { code: 'vi', nativeName: 'Tiếng Việt' },
    ]);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- supportedLanguages` (from `frontend/`)
Expected: FAIL — `src/i18n/supportedLanguages.js` does not exist.

- [ ] **Step 4: Create the config file**

Create `frontend/src/i18n/supportedLanguages.js`:

```js
export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', nativeName: 'English' },
  { code: 'es-US', nativeName: 'Español' },
  { code: 'fil-PH', nativeName: 'Filipino' },
  { code: 'zh-Hans', nativeName: '简体中文' },
  { code: 'vi', nativeName: 'Tiếng Việt' },
];
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- supportedLanguages`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/i18n/supportedLanguages.js frontend/src/i18n/supportedLanguages.test.js
git commit -m "feat(i18n): add i18next dependencies and supported-languages config"
```

---

### Task 2: Locale-alias normalization for browser detection

**Files:**
- Create: `frontend/src/i18n/localeAliases.js`
- Test: `frontend/src/i18n/localeAliases.test.js`

**Interfaces:**
- Consumes: nothing (pure function, no dependency on Task 1's file).
- Produces: `normalizeDetectedLocale(detected: string | undefined, supportedLngs: string[]) => string | undefined`, exported from `src/i18n/localeAliases.js`. Used by Task 3's `i18n/index.js` as `detection.convertDetectedLanguage`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/i18n/localeAliases.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { normalizeDetectedLocale } from './localeAliases.js';

const SUPPORTED = ['en-US', 'es-US', 'fil-PH', 'zh-Hans', 'vi'];

describe('normalizeDetectedLocale', () => {
  it('returns an exact supported code unchanged', () => {
    expect(normalizeDetectedLocale('es-US', SUPPORTED)).toBe('es-US');
  });

  it('matches a supported code case-insensitively', () => {
    expect(normalizeDetectedLocale('ES-US', SUPPORTED)).toBe('es-US');
  });

  it('maps common Spanish browser variants to es-US', () => {
    expect(normalizeDetectedLocale('es', SUPPORTED)).toBe('es-US');
    expect(normalizeDetectedLocale('es-MX', SUPPORTED)).toBe('es-US');
    expect(normalizeDetectedLocale('es-ES', SUPPORTED)).toBe('es-US');
  });

  it('maps Filipino/Tagalog browser variants to fil-PH', () => {
    expect(normalizeDetectedLocale('fil', SUPPORTED)).toBe('fil-PH');
    expect(normalizeDetectedLocale('tl', SUPPORTED)).toBe('fil-PH');
  });

  it('maps Chinese browser variants to zh-Hans', () => {
    expect(normalizeDetectedLocale('zh', SUPPORTED)).toBe('zh-Hans');
    expect(normalizeDetectedLocale('zh-CN', SUPPORTED)).toBe('zh-Hans');
    expect(normalizeDetectedLocale('zh-SG', SUPPORTED)).toBe('zh-Hans');
  });

  it('maps Vietnamese browser variants to vi', () => {
    expect(normalizeDetectedLocale('vi-VN', SUPPORTED)).toBe('vi');
  });

  it('returns an unrecognized language unchanged, letting fallbackLng take over', () => {
    expect(normalizeDetectedLocale('de-DE', SUPPORTED)).toBe('de-DE');
  });

  it('returns falsy input unchanged', () => {
    expect(normalizeDetectedLocale(undefined, SUPPORTED)).toBe(undefined);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- localeAliases`
Expected: FAIL — `src/i18n/localeAliases.js` does not exist.

- [ ] **Step 3: Implement**

Create `frontend/src/i18n/localeAliases.js`:

```js
const LOCALE_ALIASES = {
  en: 'en-US',
  es: 'es-US',
  'es-mx': 'es-US',
  'es-es': 'es-US',
  fil: 'fil-PH',
  tl: 'fil-PH',
  zh: 'zh-Hans',
  'zh-cn': 'zh-Hans',
  'zh-sg': 'zh-Hans',
  vi: 'vi',
  'vi-vn': 'vi',
};

export function normalizeDetectedLocale(detected, supportedLngs) {
  if (!detected) return detected;

  const lower = detected.toLowerCase();
  const exactMatch = supportedLngs.find((code) => code.toLowerCase() === lower);
  if (exactMatch) return exactMatch;

  if (LOCALE_ALIASES[lower]) return LOCALE_ALIASES[lower];

  const primarySubtag = lower.split('-')[0];
  if (LOCALE_ALIASES[primarySubtag]) return LOCALE_ALIASES[primarySubtag];

  return detected;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- localeAliases`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/i18n/localeAliases.js frontend/src/i18n/localeAliases.test.js
git commit -m "feat(i18n): add browser-language alias normalization"
```

---

### Task 3: i18next runtime init, app wiring, and test-environment setup

**Files:**
- Create: `frontend/src/i18n/index.js`
- Modify: `frontend/src/main.jsx`
- Modify: `frontend/src/test/setup.js`

**Interfaces:**
- Consumes: `SUPPORTED_LANGUAGES` (Task 1), `normalizeDetectedLocale` (Task 2).
- Produces: the default-exported, initialized `i18n` singleton from `src/i18n/index.js`, imported for its side effect by `main.jsx`. From this task onward, `useTranslation()` is available in any component. Also establishes that `frontend/src/i18n/locales/<locale>/common.json` files must exist for the dynamic `import()` backend to resolve (created in Task 4) — the app will run before Task 4 but any `t()` call will render the fallback key string until then, which is fine since no component calls `t()` yet.

- [ ] **Step 1: Create the i18next init module**

Create `frontend/src/i18n/index.js`:

```js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { SUPPORTED_LANGUAGES } from './supportedLanguages.js';
import { normalizeDetectedLocale } from './localeAliases.js';

const supportedLngs = SUPPORTED_LANGUAGES.map((language) => language.code);

i18n
  .use(resourcesToBackend((language, namespace) => import(`./locales/${language}/${namespace}.json`)))
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en-US',
    supportedLngs,
    ns: ['common'],
    defaultNS: 'common',
    partialBundledLanguages: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      convertDetectedLanguage: (detected) => normalizeDetectedLocale(detected, supportedLngs),
    },
    react: { useSuspense: true },
  });

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language;
});

export default i18n;
```

- [ ] **Step 2: Wire it into the app entry point**

Modify `frontend/src/main.jsx`:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './i18n/index.js';
import './index.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <React.Suspense fallback={null}>
      <App />
    </React.Suspense>
  </React.StrictMode>
);
```

The `Suspense` boundary is required because `react-i18next` suspends on first render until the active language's requested namespaces finish loading via the dynamic-`import()` backend. `fallback={null}` is intentional — the initial `common` namespace fetch is a same-origin JS chunk load, fast enough that a loading UI would just flash; revisit only if manual testing in Task 10 shows a visible blank flash.

- [ ] **Step 3: Give the test environment a synchronous i18n instance**

Modify `frontend/src/test/setup.js` — add this block as the **first** thing in the file, before the existing `localStorage`/`sessionStorage` fix:

```js
import '@testing-library/jest-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from '../i18n/locales/en-US/common.json';

// Component tests call useTranslation() directly without wrapping in a
// provider, which means they use react-i18next's default i18next instance.
// The production init in src/i18n/index.js loads translations asynchronously
// via dynamic import() (see Task 3 of the i18n plan), which would make every
// existing render-and-assert test flaky/async for no benefit — tests never
// exercise language detection or the network-like backend, they just need
// real English strings available synchronously on first render. This init
// is intentionally separate from src/i18n/index.js and only ever loads the
// en-US common namespace inline; per-locale translation-switching behavior
// is covered by LanguageSelector.test.jsx and localeAliases.test.js instead.
i18n.use(initReactI18next).init({
  lng: 'en-US',
  fallbackLng: 'en-US',
  ns: ['common'],
  defaultNS: 'common',
  resources: { 'en-US': { common: enCommon } },
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});
```

The rest of `frontend/src/test/setup.js` (the `localStorage`/`sessionStorage`, `IntersectionObserver`, `ResizeObserver`, `getBoundingClientRect`, `matchMedia`, and `scrollIntoView` stubs) stays exactly as-is below this new block.

This step depends on `frontend/src/i18n/locales/en-US/common.json` existing — created in Task 4. Until Task 4 lands, this import will fail; that's expected and resolved by the next task.

- [ ] **Step 4: Verify (after Task 4's common.json exists)**

This step's verification is deferred to the end of Task 4, since `setup.js` now imports a file Task 4 creates. Leave a note and proceed to Task 4 before running `npm test`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/i18n/index.js frontend/src/main.jsx frontend/src/test/setup.js
git commit -m "feat(i18n): initialize i18next for app and test environments"
```

---

### Task 4: `common.json` for all 5 launch locales

**Files:**
- Create: `frontend/src/i18n/locales/en-US/common.json`
- Create: `frontend/src/i18n/locales/es-US/common.json`
- Create: `frontend/src/i18n/locales/fil-PH/common.json`
- Create: `frontend/src/i18n/locales/zh-Hans/common.json`
- Create: `frontend/src/i18n/locales/vi/common.json`
- Test: `frontend/src/i18n/localeKeyParity.test.js`

**Interfaces:**
- Produces: the `common` namespace's key set — `nav.*`, `footer.*`, `errors.*`, `pagination.*` — consumed by Tasks 3 (test setup import), 5 (`LanguageSelector`), 6 (`Navbar`), 7 (`MobileMenu`), 8 (`PublicFooter`), 9 (`ErrorState`, `Pagination`). Exact key list below; every task after this one must use these key paths verbatim.

- [ ] **Step 1: Write the failing key-parity test**

Create `frontend/src/i18n/localeKeyParity.test.js`:

```js
import { describe, expect, it } from 'vitest';
import enUS from './locales/en-US/common.json';
import esUS from './locales/es-US/common.json';
import filPH from './locales/fil-PH/common.json';
import zhHans from './locales/zh-Hans/common.json';
import vi from './locales/vi/common.json';

function flattenKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object' && value !== null ? flattenKeys(value, path) : [path];
  });
}

describe('common.json locale key parity', () => {
  const englishKeys = flattenKeys(enUS).sort();

  it.each([
    ['es-US', esUS],
    ['fil-PH', filPH],
    ['zh-Hans', zhHans],
    ['vi', vi],
  ])('%s has exactly the same keys as en-US', (_locale, translations) => {
    expect(flattenKeys(translations).sort()).toEqual(englishKeys);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- localeKeyParity`
Expected: FAIL — none of the 5 `common.json` files exist yet.

- [ ] **Step 3: Create `frontend/src/i18n/locales/en-US/common.json`**

```json
{
  "nav": {
    "home": "Home",
    "trending": "Trending",
    "categories": "Categories",
    "allCategories": "All Categories",
    "bestSellers": "Best Sellers",
    "newArrivals": "New Arrivals",
    "allProducts": "All Products",
    "buyingGuides": "Buying Guides",
    "aboutUs": "About Us",
    "contactUs": "Contact Us",
    "privacyPolicy": "Privacy Policy",
    "termsOfUse": "Terms of Use",
    "affiliateDisclosure": "Affiliate Disclosure",
    "searchPlaceholder": "Search products...",
    "searchInputAriaLabel": "Search products",
    "searchButtonAriaLabel": "Search",
    "openMenuAriaLabel": "Open menu",
    "siteNavigationAriaLabel": "Site navigation",
    "homeLogoAriaLabel": "2Go Findz home",
    "changeLanguageAriaLabel": "Change language"
  },
  "footer": {
    "shopHeading": "Shop",
    "discoverHeading": "Discover",
    "companyHeading": "Company",
    "defaultBio": "Discover trending Amazon products, everyday essentials, affordable finds, and must-have items carefully selected to help you shop smarter.",
    "copyright": "© {{year}} 2Go Findz. All rights reserved."
  },
  "errors": {
    "somethingWentWrong": "Something went wrong.",
    "tryAgain": "Try again"
  },
  "pagination": {
    "navigationAriaLabel": "Pagination",
    "previousPageAriaLabel": "Previous page",
    "nextPageAriaLabel": "Next page"
  }
}
```

- [ ] **Step 4: Create `frontend/src/i18n/locales/es-US/common.json`**

```json
{
  "nav": {
    "home": "Inicio",
    "trending": "Tendencias",
    "categories": "Categorías",
    "allCategories": "Todas las categorías",
    "bestSellers": "Más vendidos",
    "newArrivals": "Novedades",
    "allProducts": "Todos los productos",
    "buyingGuides": "Guías de compra",
    "aboutUs": "Sobre nosotros",
    "contactUs": "Contáctanos",
    "privacyPolicy": "Política de privacidad",
    "termsOfUse": "Términos de uso",
    "affiliateDisclosure": "Divulgación de afiliados",
    "searchPlaceholder": "Buscar productos...",
    "searchInputAriaLabel": "Buscar productos",
    "searchButtonAriaLabel": "Buscar",
    "openMenuAriaLabel": "Abrir menú",
    "siteNavigationAriaLabel": "Navegación del sitio",
    "homeLogoAriaLabel": "Inicio de 2Go Findz",
    "changeLanguageAriaLabel": "Cambiar idioma"
  },
  "footer": {
    "shopHeading": "Comprar",
    "discoverHeading": "Descubrir",
    "companyHeading": "Empresa",
    "defaultBio": "Descubre productos de tendencia en Amazon, artículos esenciales, hallazgos económicos y productos imprescindibles, seleccionados cuidadosamente para ayudarte a comprar mejor.",
    "copyright": "© {{year}} 2Go Findz. Todos los derechos reservados."
  },
  "errors": {
    "somethingWentWrong": "Algo salió mal.",
    "tryAgain": "Intentar de nuevo"
  },
  "pagination": {
    "navigationAriaLabel": "Paginación",
    "previousPageAriaLabel": "Página anterior",
    "nextPageAriaLabel": "Página siguiente"
  }
}
```

- [ ] **Step 5: Create `frontend/src/i18n/locales/fil-PH/common.json`**

```json
{
  "nav": {
    "home": "Home",
    "trending": "Uso Ngayon",
    "categories": "Mga Kategorya",
    "allCategories": "Lahat ng Kategorya",
    "bestSellers": "Pinakabenta",
    "newArrivals": "Bagong Dating",
    "allProducts": "Lahat ng Produkto",
    "buyingGuides": "Mga Gabay sa Pamimili",
    "aboutUs": "Tungkol sa Amin",
    "contactUs": "Makipag-ugnayan",
    "privacyPolicy": "Patakaran sa Privacy",
    "termsOfUse": "Mga Tuntunin ng Paggamit",
    "affiliateDisclosure": "Paglalahad ng Affiliate",
    "searchPlaceholder": "Maghanap ng produkto...",
    "searchInputAriaLabel": "Maghanap ng produkto",
    "searchButtonAriaLabel": "Maghanap",
    "openMenuAriaLabel": "Buksan ang menu",
    "siteNavigationAriaLabel": "Nabigasyon ng site",
    "homeLogoAriaLabel": "Home ng 2Go Findz",
    "changeLanguageAriaLabel": "Baguhin ang wika"
  },
  "footer": {
    "shopHeading": "Mamili",
    "discoverHeading": "Tuklasin",
    "companyHeading": "Kumpanya",
    "defaultBio": "Tuklasin ang mga uso sa Amazon, pang-araw-araw na pangangailangan, murang produkto, at mga must-have item na maingat na pinili para tulungan kang mamili nang mas matalino.",
    "copyright": "© {{year}} 2Go Findz. Lahat ng karapatan ay nakalaan."
  },
  "errors": {
    "somethingWentWrong": "May naganap na error.",
    "tryAgain": "Subukan muli"
  },
  "pagination": {
    "navigationAriaLabel": "Nabigasyon ng pahina",
    "previousPageAriaLabel": "Nakaraang pahina",
    "nextPageAriaLabel": "Susunod na pahina"
  }
}
```

- [ ] **Step 6: Create `frontend/src/i18n/locales/zh-Hans/common.json`**

```json
{
  "nav": {
    "home": "首页",
    "trending": "热门",
    "categories": "分类",
    "allCategories": "所有分类",
    "bestSellers": "畅销产品",
    "newArrivals": "新品上市",
    "allProducts": "所有产品",
    "buyingGuides": "购买指南",
    "aboutUs": "关于我们",
    "contactUs": "联系我们",
    "privacyPolicy": "隐私政策",
    "termsOfUse": "使用条款",
    "affiliateDisclosure": "联盟营销披露",
    "searchPlaceholder": "搜索商品...",
    "searchInputAriaLabel": "搜索商品",
    "searchButtonAriaLabel": "搜索",
    "openMenuAriaLabel": "打开菜单",
    "siteNavigationAriaLabel": "网站导航",
    "homeLogoAriaLabel": "2Go Findz 首页",
    "changeLanguageAriaLabel": "更改语言"
  },
  "footer": {
    "shopHeading": "购物",
    "discoverHeading": "发现",
    "companyHeading": "公司",
    "defaultBio": "发现亚马逊热门商品、日常必需品、超值好物,精心挑选,助您更聪明地购物。",
    "copyright": "© {{year}} 2Go Findz。保留所有权利。"
  },
  "errors": {
    "somethingWentWrong": "出现问题,请稍后再试。",
    "tryAgain": "重试"
  },
  "pagination": {
    "navigationAriaLabel": "分页",
    "previousPageAriaLabel": "上一页",
    "nextPageAriaLabel": "下一页"
  }
}
```

- [ ] **Step 7: Create `frontend/src/i18n/locales/vi/common.json`**

```json
{
  "nav": {
    "home": "Trang chủ",
    "trending": "Xu hướng",
    "categories": "Danh mục",
    "allCategories": "Tất cả danh mục",
    "bestSellers": "Bán chạy nhất",
    "newArrivals": "Hàng mới về",
    "allProducts": "Tất cả sản phẩm",
    "buyingGuides": "Hướng dẫn mua hàng",
    "aboutUs": "Về chúng tôi",
    "contactUs": "Liên hệ",
    "privacyPolicy": "Chính sách bảo mật",
    "termsOfUse": "Điều khoản sử dụng",
    "affiliateDisclosure": "Công bố tiếp thị liên kết",
    "searchPlaceholder": "Tìm kiếm sản phẩm...",
    "searchInputAriaLabel": "Tìm kiếm sản phẩm",
    "searchButtonAriaLabel": "Tìm kiếm",
    "openMenuAriaLabel": "Mở menu",
    "siteNavigationAriaLabel": "Điều hướng trang web",
    "homeLogoAriaLabel": "Trang chủ 2Go Findz",
    "changeLanguageAriaLabel": "Đổi ngôn ngữ"
  },
  "footer": {
    "shopHeading": "Mua sắm",
    "discoverHeading": "Khám phá",
    "companyHeading": "Công ty",
    "defaultBio": "Khám phá các sản phẩm Amazon thịnh hành, vật dụng thiết yếu hằng ngày, món hời giá tốt và các sản phẩm không thể thiếu, được tuyển chọn kỹ lưỡng để giúp bạn mua sắm thông minh hơn.",
    "copyright": "© {{year}} 2Go Findz. Đã đăng ký bản quyền."
  },
  "errors": {
    "somethingWentWrong": "Đã xảy ra lỗi.",
    "tryAgain": "Thử lại"
  },
  "pagination": {
    "navigationAriaLabel": "Phân trang",
    "previousPageAriaLabel": "Trang trước",
    "nextPageAriaLabel": "Trang sau"
  }
}
```

- [ ] **Step 8: Run the key-parity test to verify it passes**

Run: `npm test -- localeKeyParity`
Expected: PASS

- [ ] **Step 9: Run the full suite to verify Task 3's `setup.js` import now resolves**

Run: `npm test`
Expected: PASS (all existing tests still green — `setup.js`'s new synchronous i18n init doesn't change any rendered output since no component calls `t()` yet).

- [ ] **Step 10: Commit**

```bash
git add frontend/src/i18n/locales frontend/src/i18n/localeKeyParity.test.js
git commit -m "feat(i18n): add common namespace translations for all 5 launch locales"
```

---

### Task 5: `LanguageSelector` component (desktop dropdown)

**Files:**
- Create: `frontend/src/components/LanguageSelector.jsx`
- Test: `frontend/src/components/LanguageSelector.test.jsx`

**Interfaces:**
- Consumes: `SUPPORTED_LANGUAGES` (Task 1), `common.json`'s `nav.changeLanguageAriaLabel` (Task 4).
- Produces: default-exported `LanguageSelector` component (no props) from `src/components/LanguageSelector.jsx`. Used by Task 6 (`Navbar.jsx`).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/LanguageSelector.test.jsx`:

```jsx
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from 'i18next';
import LanguageSelector from './LanguageSelector.jsx';

afterEach(async () => {
  await i18n.changeLanguage('en-US');
});

describe('LanguageSelector', () => {
  it('renders a closed menu by default with a globe trigger button', () => {
    render(<LanguageSelector />);
    expect(screen.getByRole('button', { name: 'Change language' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the menu on click, listing all 5 supported languages by native name', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: 'Change language' }));

    const menu = screen.getByRole('menu');
    expect(within(menu).getByText('English')).toBeInTheDocument();
    expect(within(menu).getByText('Español')).toBeInTheDocument();
    expect(within(menu).getByText('Filipino')).toBeInTheDocument();
    expect(within(menu).getByText('简体中文')).toBeInTheDocument();
    expect(within(menu).getByText('Tiếng Việt')).toBeInTheDocument();
  });

  it('shows a checkmark next to the currently active language only', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: 'Change language' }));

    const englishItem = screen.getByRole('menuitem', { name: /English/ });
    const spanishItem = screen.getByRole('menuitem', { name: /Español/ });
    expect(englishItem.querySelector('svg')).toBeInTheDocument();
    expect(spanishItem.querySelector('svg')).not.toBeInTheDocument();
  });

  it('changes the active language and closes the menu when an item is selected', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    await user.click(screen.getByRole('button', { name: 'Change language' }));
    await user.click(screen.getByRole('menuitem', { name: /Español/ }));

    await waitFor(() => expect(i18n.language).toBe('es-US'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes the menu on outside click', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <LanguageSelector />
        <button type="button">outside</button>
      </div>
    );
    await user.click(screen.getByRole('button', { name: 'Change language' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes the menu on Escape and returns focus to the trigger button', async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);
    const trigger = screen.getByRole('button', { name: 'Change language' });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- LanguageSelector`
Expected: FAIL — `src/components/LanguageSelector.jsx` does not exist.

- [ ] **Step 3: Implement the component**

Create `frontend/src/components/LanguageSelector.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n/supportedLanguages.js';

function LanguageSelector() {
  const { t, i18n } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function selectLanguage(code) {
    i18n.changeLanguage(code);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t('nav.changeLanguageAriaLabel')}
        className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <Globe size={18} aria-hidden="true" />
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label={t('nav.changeLanguageAriaLabel')}
          className="absolute right-0 top-full mt-2 w-44 rounded-card border border-slate-200 bg-white py-2 shadow-dropdown"
        >
          {SUPPORTED_LANGUAGES.map(({ code, nativeName }) => (
            <button
              key={code}
              type="button"
              role="menuitem"
              onClick={() => selectLanguage(code)}
              className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {nativeName}
              {i18n.language === code && <Check size={16} className="text-primary" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSelector;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- LanguageSelector`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/LanguageSelector.jsx frontend/src/components/LanguageSelector.test.jsx
git commit -m "feat(i18n): add LanguageSelector dropdown component"
```

---

### Task 6: Migrate `Navbar.jsx` and mount the selector

**Files:**
- Modify: `frontend/src/components/Navbar.jsx`
- Test: `frontend/src/components/Navbar.test.jsx` (read existing file first; see Step 3)

**Interfaces:**
- Consumes: `LanguageSelector` (Task 5), `common.json` `nav.*` keys (Task 4).

- [ ] **Step 1: Replace the file contents**

Replace `frontend/src/components/Navbar.jsx` in full with:

```jsx
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Menu, Search } from 'lucide-react';
import logo from '../assets/2gofindz.png';
import MobileMenu from './MobileMenu.jsx';
import LanguageSelector from './LanguageSelector.jsx';
import { getCategories } from '../services/categoryService.js';
// Compare nav entry point is hidden pending a future redesign — see the commented
// NavLink below. The Compare feature itself (useCompare/CompareContext/ComparePage)
// is untouched, just unreachable from navigation for now.

const navLinkClassName = ({ isActive }) =>
  `text-nav transition ${isActive ? 'text-white' : 'text-white/70 hover:text-white'}`;

function Navbar() {
  const { t } = useTranslation('common');
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
          <Link to="/" aria-label={t('nav.homeLogoAriaLabel')}>
            <img src={logo} alt="2Go Findz" className="h-14 w-auto" />
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
            <NavLink to="/" end className={navLinkClassName}>
              {t('nav.home')}
            </NavLink>
            <NavLink to="/trending" className={navLinkClassName}>
              {t('nav.trending')}
            </NavLink>
            <div ref={categoriesRef} className="relative">
              <button
                type="button"
                onClick={() => setIsCategoriesOpen((open) => !open)}
                aria-expanded={isCategoriesOpen}
                aria-haspopup="menu"
                className="flex items-center gap-1 text-nav text-white/70 transition hover:text-white"
              >
                {t('nav.categories')}
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
                    {t('nav.allCategories')}
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
            {/* Compare — hidden for now pending a future redesign. Re-enable by restoring
                this NavLink, the `const { ids } = useCompare();` line above, the Badge
                import, and the compareCount prop on <MobileMenu> below. */}
            <NavLink to="/buying-guides" className={navLinkClassName}>
              {t('nav.buyingGuides')}
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} role="search" className="relative hidden sm:block">
              <button
                type="submit"
                aria-label={t('nav.searchButtonAriaLabel')}
                className="absolute left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-white/50 hover:text-white"
              >
                <Search size={16} aria-hidden="true" />
              </button>
              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={t('nav.searchPlaceholder')}
                aria-label={t('nav.searchInputAriaLabel')}
                className="w-40 rounded-search border border-white/20 bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-white lg:w-56"
              />
            </form>
            <LanguageSelector />
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label={t('nav.openMenuAriaLabel')}
              className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </>
  );
}

export default Navbar;
```

The only behavioral change versus the previous file is: every literal English string is now a `t(...)` call resolving to the exact same English text by default, and `<LanguageSelector />` is mounted between the search form and the mobile-menu button.

- [ ] **Step 2: Run the existing Navbar test file**

Run: `npm test -- Navbar.test`

- [ ] **Step 3: Fix any failures**

Since every `t(...)` call resolves to the identical English string that was previously hardcoded (verified against `frontend/src/i18n/locales/en-US/common.json` from Task 4), and the test environment's `setup.js` (Task 3) provides those strings synchronously, existing assertions like `screen.getByText('Trending')` or `screen.getByLabelText('Search products')` should keep passing unchanged. If any assertion fails, open `frontend/src/components/Navbar.test.jsx`, compare the failing assertion's expected string against the corresponding `nav.*` value in `en-US/common.json`, and correct whichever one doesn't match — do not change the visible English copy from what it was before this task.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Navbar.jsx frontend/src/components/Navbar.test.jsx
git commit -m "feat(i18n): translate Navbar and mount the language selector"
```

---

### Task 7: Migrate `MobileMenu.jsx` and add the inline mobile language list

**Files:**
- Modify: `frontend/src/components/MobileMenu.jsx`
- Test: `frontend/src/components/MobileMenu.test.jsx` (read existing file first; see Step 3)

**Interfaces:**
- Consumes: `SUPPORTED_LANGUAGES` (Task 1), `common.json` `nav.*` keys (Task 4).

- [ ] **Step 1: Replace the file contents**

Replace `frontend/src/components/MobileMenu.jsx` in full with:

```jsx
import { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Badge from './Badge.jsx';
import { SUPPORTED_LANGUAGES } from '../i18n/supportedLanguages.js';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function MobileMenu({ isOpen, onClose, compareCount = 0 }) {
  const { t, i18n } = useTranslation('common');
  const panelRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  const navItems = [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/trending', label: t('nav.trending') },
    { to: '/categories', label: t('nav.categories') },
    // Compare is hidden for now pending a future redesign — re-add
    // { to: '/compare', label: t('nav.compare') } here to restore it.
    { to: '/buying-guides', label: t('nav.buyingGuides') },
  ];

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
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t('nav.siteNavigationAriaLabel')}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        ref={panelRef}
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'tween', duration: 0.2 }}
        className="absolute inset-y-0 left-0 w-64 bg-white"
      >
        <nav aria-label={t('nav.siteNavigationAriaLabel')} className="flex h-full flex-col overflow-y-auto px-3 py-6">
          <ul className="flex-1 space-y-1">
            {navItems.map(({ to, label, end }) => (
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
                {t('nav.searchButtonAriaLabel')}
              </Link>
            </li>
          </ul>

          <div className="mt-4 border-t border-border pt-4">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {t('nav.changeLanguageAriaLabel')}
            </p>
            <ul className="space-y-1">
              {SUPPORTED_LANGUAGES.map(({ code, nativeName }) => (
                <li key={code}>
                  <button
                    type="button"
                    onClick={() => i18n.changeLanguage(code)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-body hover:bg-slate-100"
                  >
                    {nativeName}
                    {i18n.language === code && <Check size={16} className="text-primary" aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </motion.div>
    </div>
  );
}

export default MobileMenu;
```

Two deliberate, spec-driven changes beyond translation: the nav list now derives `label` from `t(...)` instead of a module-level `NAV_ITEMS` constant (translations require the hook, which only exists inside the component), and the panel's `<nav>` gained `overflow-y-auto` to satisfy the spec's "mobile-menu equivalent that doesn't overflow small screens" now that a language section was added below the existing links.

- [ ] **Step 2: Run the existing MobileMenu test file**

Run: `npm test -- MobileMenu.test`

- [ ] **Step 3: Fix any failures**

Same reasoning as Task 6, Step 3 — English text is unchanged, so existing assertions should still pass. If `frontend/src/components/MobileMenu.test.jsx` asserts against the old module-level `NAV_ITEMS` export or otherwise relies on `label` values, verify against `en-US/common.json`'s `nav.*` values instead and correct only the assertion, not the visible copy.

- [ ] **Step 4: Add a test for the new language list**

Add this test to `frontend/src/components/MobileMenu.test.jsx` (adjust the `import`/mock setup at the top to match whatever pattern the existing file already uses for `onClose`, etc.):

```jsx
it('lists all 5 languages inline and switches the active language on tap', async () => {
  const user = userEvent.setup();
  render(<MobileMenu isOpen onClose={() => {}} />);

  const spanishOption = screen.getByRole('button', { name: /Español/ });
  await user.click(spanishOption);

  await waitFor(() => expect(i18n.language).toBe('es-US'));
});
```

This requires `import i18n from 'i18next';` and `import { waitFor } from '@testing-library/react';` at the top of the test file if not already present, and an `afterEach(async () => { await i18n.changeLanguage('en-US'); })` block if the file doesn't already reset state between tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/MobileMenu.jsx frontend/src/components/MobileMenu.test.jsx
git commit -m "feat(i18n): translate MobileMenu and add inline mobile language switcher"
```

---

### Task 8: Migrate `PublicFooter.jsx`

**Files:**
- Modify: `frontend/src/components/PublicFooter.jsx`
- Test: `frontend/src/components/PublicFooter.test.jsx` (read existing file first; see Step 3)

**Interfaces:**
- Consumes: `common.json` `nav.*` and `footer.*` keys (Task 4).

- [ ] **Step 1: Replace the file contents**

Replace `frontend/src/components/PublicFooter.jsx` in full with:

```jsx
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AffiliateDisclosure from './AffiliateDisclosure.jsx';

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="text-small font-semibold uppercase tracking-wide text-white">{title}</h3>
      <ul className="mt-4 space-y-2">
        {links.map(({ to, label }) => (
          <li key={to}>
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
  const { t } = useTranslation('common');

  const shopLinks = [
    { to: '/trending', label: t('nav.trending') },
    { to: '/best-sellers', label: t('nav.bestSellers') },
    { to: '/products?sort=createdAt,desc', label: t('nav.newArrivals') },
    { to: '/products', label: t('nav.allProducts') },
  ];

  const discoverLinks = [
    { to: '/categories', label: t('nav.categories') },
    { to: '/buying-guides', label: t('nav.buyingGuides') },
  ];

  const companyLinks = [
    { to: '/about', label: t('nav.aboutUs') },
    { to: '/contact', label: t('nav.contactUs') },
    { to: '/privacy-policy', label: t('nav.privacyPolicy') },
    { to: '/terms-of-use', label: t('nav.termsOfUse') },
    { to: '/affiliate-disclosure', label: t('nav.affiliateDisclosure') },
  ];

  return (
    <footer className="bg-navy-950 py-16 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <span className="text-card-title text-white">2Go Findz</span>
            <p className="mt-4 max-w-sm text-small text-white/70">
              {settings?.shopBio ?? t('footer.defaultBio')}
            </p>
          </div>
          <FooterColumn title={t('footer.shopHeading')} links={shopLinks} />
          <FooterColumn title={t('footer.discoverHeading')} links={discoverLinks} />
          <FooterColumn title={t('footer.companyHeading')} links={companyLinks} />
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p className="text-small text-white/50">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          {settings?.contactEmail && (
            <a href={`mailto:${settings.contactEmail}`} className="text-small text-white/70 hover:text-white">
              {settings.contactEmail}
            </a>
          )}
        </div>
        <div className="mt-4 text-center sm:text-left">
          <AffiliateDisclosure
            text={settings?.affiliateDisclosure}
            className="text-small leading-relaxed text-white/60"
          />
        </div>
      </div>
    </footer>
  );
}

export default PublicFooter;
```

Note `FooterColumn`'s list key changed from `key={label}` to `key={to}` — labels are now derived from translations rather than being fixed strings, so the route path is the correct stable identity.

- [ ] **Step 2: Run the existing PublicFooter test file**

Run: `npm test -- PublicFooter.test`

- [ ] **Step 3: Fix any failures**

Same reasoning as prior tasks — check any failing assertion against `en-US/common.json`'s `nav.*`/`footer.*` values and correct only the assertion.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/PublicFooter.jsx frontend/src/components/PublicFooter.test.jsx
git commit -m "feat(i18n): translate PublicFooter"
```

---

### Task 9: Migrate `ErrorState.jsx` and `Pagination.jsx`

**Files:**
- Modify: `frontend/src/components/ErrorState.jsx`
- Modify: `frontend/src/components/Pagination.jsx`
- Test: `frontend/src/components/ErrorState.test.jsx` (read existing file first; see Step 4)
- Test: `frontend/src/components/Pagination.test.jsx` (read existing file first; see Step 4)

**Interfaces:**
- Consumes: `common.json` `errors.*` and `pagination.*` keys (Task 4).

- [ ] **Step 1: Replace `ErrorState.jsx`**

Replace `frontend/src/components/ErrorState.jsx` in full with:

```jsx
import { useTranslation } from 'react-i18next';
import Button from './Button.jsx';

function ErrorState({ message, onRetry }) {
  const { t } = useTranslation('common');
  const resolvedMessage = message ?? t('errors.somethingWentWrong');

  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-lg bg-danger/10 py-12 text-center">
      <p className="text-small font-medium text-danger">{resolvedMessage}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('errors.tryAgain')}
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
```

`message` switched from a default parameter value to a `??` fallback computed in the function body — a default parameter is evaluated once from the prop value at call time and can't call the `useTranslation` hook, so it would not have reacted to a language change for callers that rely on the default.

- [ ] **Step 2: Replace `Pagination.jsx`**

Replace `frontend/src/components/Pagination.jsx` in full with:

```jsx
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SIBLING_COUNT = 1;

function getPageItems(page, totalPages) {
  const shown = new Set([1, totalPages]);
  for (let i = page - SIBLING_COUNT; i <= page + SIBLING_COUNT; i += 1) {
    if (i >= 1 && i <= totalPages) shown.add(i);
  }
  const sorted = Array.from(shown).sort((a, b) => a - b);

  const items = [];
  let previous = 0;
  sorted.forEach((number) => {
    if (previous && number - previous > 1) {
      items.push({ type: 'ellipsis', key: `ellipsis-${previous}` });
    }
    items.push({ type: 'page', key: number, number });
    previous = number;
  });
  return items;
}

function Pagination({ page, totalPages, onPageChange, activeClassName = 'bg-primary text-white' }) {
  const { t } = useTranslation('common');
  if (totalPages <= 1) return null;

  const items = getPageItems(page, totalPages);

  return (
    <nav aria-label={t('pagination.navigationAriaLabel')} className="flex items-center justify-center gap-1 pt-8">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label={t('pagination.previousPageAriaLabel')}
        className="rounded-btn p-2 text-muted hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={18} />
      </button>

      {items.map((item) =>
        item.type === 'ellipsis' ? (
          <span key={item.key} aria-hidden="true" className="px-1 text-sm text-muted">
            …
          </span>
        ) : (
          <button
            key={item.key}
            type="button"
            onClick={() => onPageChange(item.number)}
            aria-current={item.number === page ? 'page' : undefined}
            className={`h-9 w-9 rounded-btn text-sm font-medium transition ${
              item.number === page ? activeClassName : 'text-body hover:bg-surface-secondary'
            }`}
          >
            {item.number}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label={t('pagination.nextPageAriaLabel')}
        className="rounded-btn p-2 text-muted hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}

export default Pagination;
```

- [ ] **Step 3: Run both existing test files**

Run: `npm test -- ErrorState.test Pagination.test`

- [ ] **Step 4: Fix any failures**

Same reasoning as prior tasks — check any failing assertion against `en-US/common.json`'s `errors.*`/`pagination.*` values and correct only the assertion.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ErrorState.jsx frontend/src/components/Pagination.jsx frontend/src/components/ErrorState.test.jsx frontend/src/components/Pagination.test.jsx
git commit -m "feat(i18n): translate ErrorState and Pagination"
```

---

### Task 10: Full verification and manual multi-language check

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm test` (from `frontend/`)
Expected: PASS, 0 failures.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: 0 errors. Fix anything flagged (e.g. unused imports left over from a migration) before proceeding.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: succeeds; confirms every dynamic `import(`./locales/${language}/${namespace}.json`)` path resolves and Vite code-splits them (check the build output for separate small chunks per locale — this is expected and correct, not a regression).

- [ ] **Step 4: Manual verification — start the dev server**

Run: `npm run dev` (or reuse an already-running instance on the standard port).

- [ ] **Step 5: Manual verification — desktop, all 5 languages**

At a desktop viewport, open the site, click the globe icon in the navbar, and for each of the 5 languages confirm: the nav labels, search placeholder, and footer text switch immediately with no page reload; the checkmark moves to the newly active language; `<html lang>` (inspect via devtools) matches the selected code; reloading the page keeps the selected language (localStorage persistence); no layout overflow in the longer Spanish/Filipino strings; Chinese characters render with a readable font.

- [ ] **Step 6: Manual verification — mobile viewport**

At a mobile viewport (e.g. 390×844), open the hamburger menu, confirm the language list appears inline near the bottom without the panel overflowing or requiring horizontal scroll, and that tapping a language switches it without closing the menu.

- [ ] **Step 7: Manual verification — detection and persistence**

In a private/incognito window (no prior `localStorage`), confirm the site defaults to English (since the test browser's `navigator.language` is presumably `en-US`); manually set `navigator.language` via devtools device emulation to `es-ES` and reload to confirm it resolves to `es-US` per Task 2's alias table; set the language via the selector, reload, and confirm the choice persists.

- [ ] **Step 8: Write the phase completion note**

Summarize in your final report to the user: what shipped (infra, selector, Navbar/MobileMenu/Footer/ErrorState/Pagination translated into 5 languages), confirmation that full suite + lint + build passed, and that the remaining public-facing text (Home, Products, Buying Guide, Compare, Legal pages) is out of scope for this plan and will be sequenced as separate follow-on plans per the Phase 1 spec's own note on file-count scope.

---

## Self-Review Notes

- **Spec coverage:** i18next/react-i18next/detector/backend deps (Task 1), file structure with `legal`/`compare` namespaces reserved for later tasks (Task 4's structure, though this plan only populates `common.json` — the other 5 namespace files are explicitly out of scope here and land in follow-on plans), loading strategy (Task 3), detection priority and non-standard locale aliasing (Task 2/3), `<html lang>` sync (Task 3), no-reload/no-scroll-reset (falls out of the architecture, verified Task 10), selector UI with no flags/native labels/checkmark/keyboard nav/outside-click/ARIA (Task 5), mobile equivalent (Task 7), persistence priority (Task 2/3, verified Task 10), testing plan (Tasks 1-9 unit tests, Task 10 full suite/lint/build/manual) — all covered.
- **Placeholder scan:** no TBD/TODO; every translation string is a real, complete translation, not machine-placeholder text.
- **Type consistency:** `SUPPORTED_LANGUAGES` shape (`{code, nativeName}`) is identical everywhere it's used (Tasks 1, 5, 7). `normalizeDetectedLocale(detected, supportedLngs)` signature matches its one call site in Task 3. All `t('nav.*')`/`t('footer.*')`/`t('errors.*')`/`t('pagination.*')` key paths match exactly what Task 4 creates.
