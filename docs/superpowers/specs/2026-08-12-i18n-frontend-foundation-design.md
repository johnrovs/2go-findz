# i18n Phase 1: Frontend Foundation & Language Selector — Design Spec

## Context

2Go Findz is committing to a full multilingual system (English, Spanish,
Filipino, Simplified Chinese, Vietnamese at launch; architected to add more
languages later without core rework). The full request spans four largely
independent subsystems:

1. **Frontend i18n foundation** — this spec.
2. **Locale-prefixed URL routing + SEO** (`/es-US/products`, hreflang, canonical).
3. **Backend translation schema + API** (product/category/buying-guide/FAQ
   translation tables, `?locale=` support).
4. **Dynamic content wiring + admin translation UI** (translation tabs on
   Product/Category/Buying-Guide forms).

Each phase gets its own spec → plan → implementation cycle. This document
covers **Phase 1 only**: getting `i18next` running, replacing static
public-facing UI text with translation keys, and shipping the language
selector. No routing changes, no backend changes, no admin UI changes.

Confirmed via codebase research (2026-08-12): there is currently **zero**
existing i18n in this codebase (verified by grep across both frontend and
backend for `locale|i18n|translation|lang|hreflang` — only false positives
from `toLocaleDateString`/`toLocaleString` and Spring's `@Nullable`
import). This is a greenfield addition.

## Goals

- Static, public-facing UI text (nav, buttons, labels, empty/loading/error
  states, form validation, footer, a11y labels, affiliate disclosure
  copy, "View on Amazon" buttons) renders in the user's selected language.
- A globe-icon language selector (no flags) lets users switch instantly,
  with no page reload and no scroll/state loss.
- Language choice persists across visits (`localStorage`), with browser
  detection as a fallback for first-time visitors, and English as the
  ultimate fallback.
- `<html lang>` stays in sync with the active language.
- Architecture supports adding more locales later (`zh-Hant`, `ar`, `fr`,
  `ko`, `pt`, `hi`, `ht`) by adding a folder + one config line — no
  structural changes.

## Explicit non-goals for this phase

- No URL locale prefixes (`/es-US/...`) — that's Phase 2.
- No hreflang/canonical/OG localization — that's Phase 2 (extends the
  existing `useDocumentHead.js` hook).
- No translation of database-driven content — products, categories,
  buying guides, FAQs, and the homepage hero headline/description (already
  DB-driven via `system_settings.hero_headline`) stay as-is until Phase 3/4.
- No admin dashboard UI translation — admin users are internal staff;
  `ProductForm`, `CategoryForm`, and the `BuyingGuideForm` wizard's own
  chrome stays English-only. (Phase 4 adds *translation-editing* tabs to
  these forms, which is a different thing from translating the forms
  themselves.)
- No RTL enablement (Arabic) — layout should not actively break for a
  future RTL locale, but no RTL work happens now.

## Dependencies

Add to `frontend/package.json`:
- `i18next`
- `react-i18next`
- `i18next-browser-languagedetector`
- `i18next-resources-to-backend` — wraps dynamic `import()` so Vite
  code-splits each locale/namespace into its own chunk. Chosen over
  `i18next-http-backend` (would require a `public/locales` folder served
  as static assets, an unnecessary HTTP round-trip for co-located JSON)
  and over static eager imports of all locales (defeats "avoid loading
  every language upfront").

No backend dependency changes in this phase.

## File structure

```
src/i18n/
  index.js                     # i18next init, detector config, backend wiring
  locales/
    en-US/
      common.json               # nav, footer, buttons, a11y labels, pagination,
                                 # generic empty/loading/error states
      home.json
      products.json              # product cards, filters, sorting, product detail labels
      guides.json                # buying guide sections, comparison tables, pros/cons, FAQs
      legal.json                 # About, Contact, Privacy Policy, Terms, Affiliate Disclosure
      compare.json                # Compare / Comparisons pages
    es-US/  (same 6 files)
    fil-PH/ (same 6 files)
    zh-Hans/ (same 6 files)
    vi/     (same 6 files)
```

`legal` and `compare` are added beyond the spec's original 4 namespaces —
`common.json` stays focused on strings shared across nearly every page
(nav, footer, generic buttons) rather than absorbing long-form legal copy
or compare-specific strings, which would bloat the namespace loaded on
every route.

Adding a 6th launch-ready locale later means: add a new
`src/i18n/locales/<code>/` folder with the 6 JSON files, add `<code>` to
`supportedLngs` in `src/i18n/index.js`, add its native label + checkmark
target to the selector's language list. No other code changes.

## Loading strategy

- `i18next-resources-to-backend` loads a given `(language, namespace)`
  pair via `import(`./locales/${language}/${namespace}.json`)`. Vite
  automatically splits each into its own chunk — only the active
  language's requested namespaces are ever fetched.
- Each page/component calls `useTranslation([...])` naming only the
  namespaces it needs (e.g. `Navbar`/`PublicFooter` use `['common']`;
  `HomePage` uses `['common', 'home']`; a buying-guide page uses
  `['common', 'guides']`). i18next only fetches namespaces that are
  actually requested — this is what keeps loading lazy, not a separate
  mechanism.
- `partialBundledLanguages: true` so namespace-level lazy loading works
  correctly alongside the backend.

## Language detection & persistence

`src/i18n/index.js` configures `i18next-browser-languagedetector`:

```js
detection: {
  order: ['localStorage', 'navigator'],
  caches: ['localStorage'],
  lookupLocalStorage: 'i18nextLng',
}
```

**Non-standard locale code matching.** Our launch codes (`es-US`,
`fil-PH`, `zh-Hans`, `vi`) don't follow the typical
"language-only-or-language+region" pattern browsers report
(`navigator.languages` typically yields things like `es`, `es-MX`,
`zh-CN`, `zh-TW`, `fil`, `vi-VN`). Rather than rely on i18next's default
subtag-matching (which would not reliably resolve `es-MX` → `es-US` or
`zh-CN` → `zh-Hans`), `src/i18n/index.js` runs a small explicit
normalization step ahead of `fallbackLng`:

```js
const LOCALE_ALIASES = {
  es: 'es-US', 'es-mx': 'es-US', 'es-es': 'es-US',
  fil: 'fil-PH', tl: 'fil-PH',
  zh: 'zh-Hans', 'zh-cn': 'zh-Hans', 'zh-sg': 'zh-Hans',
  vi: 'vi', 'vi-vn': 'vi',
};
```

matched case-insensitively against each entry in `navigator.languages`
before falling through to `fallbackLng: 'en-US'`. This keeps
`supportedLngs` strict (only the 5 real launch codes are ever active
languages) while still making browser detection actually useful for
real-world `navigator.languages` values.

- `<html lang>` sync: `i18n.on('languageChanged', (lng) => { document.documentElement.lang = lng; })`, registered once in `src/i18n/index.js`.
- No scroll-position or app-state reset: switching language triggers a
  `react-i18next` re-render only — no navigation, no remount. This
  property is free in Phase 1 since routing is untouched; Phase 2 will
  need to preserve it deliberately when introducing URL locale prefixes.
- Missing translation keys fall back to English (`fallbackLng: 'en-US'`
  plus `partialBundledLanguages` ensures a missing namespace file for a
  non-English locale doesn't crash — it resolves through the fallback
  chain). Raw i18n keys must never render — enforced via the "smoke test"
  described in Testing below, checked per page during manual verification.

## Language selector UI

**Desktop** (`Navbar.jsx`): a globe icon button added to the existing
right-side cluster at `Navbar.jsx:115` (the `<div className="flex items-center gap-2">`
that currently holds the search form and mobile-menu button), positioned
between them, visible at all breakpoints ≥ the point the search form
itself is visible, and also reachable at mobile widths since it sits
outside the `lg:hidden`/`hidden sm:block` toggles that gate the other two
elements.

Interaction pattern mirrors the existing Categories dropdown in the same
file (`Navbar.jsx:69-106`) — a proven, already-accessible pattern in this
codebase:
- Click toggles a `role="menu"` panel anchored below the button.
- Framer Motion open/close transition (matching `MobileMenu.jsx`'s
  existing `tween`/`duration: 0.2` convention).
- Outside-click closes it (`mousedown` listener + ref, same as
  `categoriesRef`).
- `Escape` closes it (same as the Categories dropdown).
- Each of the 5 languages renders in its own native label — "English",
  "Español", "Filipino", "简体中文", "Tiếng Việt" — with a checkmark icon
  next to the currently active one.
- Full keyboard nav: `Tab`/`Shift+Tab` cycles through menu items,
  `Enter`/`Space` selects, `Escape` closes and returns focus to the
  trigger button (same focus-return pattern already implemented in
  `MobileMenu.jsx:52`).
- `aria-haspopup="menu"`, `aria-expanded`, `role="menuitem"` per item,
  `aria-label="Change language"` on the trigger.
- Selecting a language closes the menu and calls `i18n.changeLanguage(code)`.

**Mobile** (`MobileMenu.jsx`): rather than nesting a second dropdown
inside the slide-out panel (which risks overflow and a confusing nested
interaction on small screens), the 5 language options render as a flat
inline row/list near the bottom of the panel, next to the existing
"Search" link (`MobileMenu.jsx:87-96`). Tapping a language applies it
immediately and does not close the menu (consistent with it not being a
navigation action).

## Static text migration scope (Phase 1)

In scope — all public-facing chrome:
- `Navbar.jsx`, `MobileMenu.jsx`, `PublicFooter.jsx`
- `src/pages/*` public pages and `src/components/home/` (22 files)
- `src/components/products/` (28 files — shared by Browse/Trending/Best
  Sellers/Categories)
- `src/components/buying-guide/` (28 files)
- `src/components/comparison-form/` (6 files) and Compare/Comparisons pages
- Generic empty/loading/error states, pagination controls, form
  validation messages, a11y labels, affiliate disclosure copy, "View on
  Amazon" button text, wherever they appear in the above.

Explicitly out of scope (see Non-goals): admin dashboard chrome, and any
DB-driven copy (product/category/guide/FAQ content, the homepage hero
headline/description).

Given the file count (~90+ components), the implementation plan (next
step) will sequence this as ordered, independently-committable tasks —
e.g. i18n infra + selector first, then Navbar/Footer/Home, then Products,
then Buying Guide, then remaining static pages/legal/compare. Exact task
breakdown is a planning-stage decision, not fixed here.

## Testing

- Vitest unit tests for the selector: open/close, keyboard nav (Tab
  cycle, Escape, focus return), checkmark on active language,
  outside-click-to-close, calls `i18n.changeLanguage` with the right code.
- Vitest tests for `src/i18n/index.js`'s detection/normalization logic:
  localStorage takes priority over browser language when both are
  present; unsupported/aliased browser languages (`es-MX`, `zh-CN`, `tl`)
  resolve to the correct supported locale; unrecognized browser languages
  fall back to `en-US`.
- Smoke tests confirming a swapped language actually renders swapped text
  on at least one representative component per namespace (e.g. `Navbar`
  for `common`, `HomePage` hero section for `home`).
- Full suite + lint + build run at the end, per project standard.
- Manual verification (documented in the phase completion report, not
  automated): visually check all 5 languages on desktop nav, mobile nav,
  home page, browse-products page, one buying guide page — confirming no
  layout overflow with longer Spanish/Filipino strings and that Chinese
  glyphs render with an acceptable font fallback.

## Open items carried forward (not blocking Phase 1)

- Exact hreflang/canonical mechanics — Phase 2.
- `?locale=` API param convention — Phase 3, informed by whatever locale
  state shape Phase 1 establishes (`i18n.language`, one of the 5 launch
  codes).
- Admin translation-tab UX for the 811-line `BuyingGuideForm` wizard —
  Phase 4.
