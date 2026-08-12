# i18n: Buying Guides Pages — Design Spec

## Context

Follow-on to `docs/superpowers/specs/2026-08-12-i18n-frontend-foundation-design.md` (Phase 1: i18next infra, language selector, Navbar/MobileMenu/PublicFooter/ErrorState/Pagination translated). That spec explicitly reserved a `guides` namespace and named the buying-guide page group as a sequenced follow-on. This spec covers translating the public Buying Guides listing page, the guide detail page, and their shared display components.

## Goals

- All static, public-facing text on the Buying Guides listing page (`/buying-guides`) and the guide detail page (`/buying-guides/:slug`) renders in the user's selected language, using the same `i18next`/`react-i18next` infrastructure and conventions established in Phase 1.
- Section headings that currently exist in two places (the sidebar table-of-contents labels and each section's own `<h2>`) are unified behind one translation key each, removing a latent drift risk.
- `BuyingGuideHero.jsx`'s "Updated" byline date renders using the active language's date format instead of being hardcoded to `en-US`.

## Non-goals

- Admin's `buying-guide-form/` wizard and `LivePreview.jsx`'s own hardcoded section headings — untouched, stay English-only, per Phase 1's admin-UI-stays-English decision.
- Database-driven guide content itself (title, excerpt, introduction, quick-pick badge names, pros/cons text, FAQ question/answer text, comparison spec names/values) — this is real per-guide content, not static UI chrome, and is Phase 3/4's job (translation tables + admin translation UI), not this pass.
- URL locale-prefixing, hreflang, canonical tags — Phase 2.
- Full structured-data (JSON-LD) localization — see the "JSON-LD" note below for the narrow exception made here.

## Scope decision: shared preview components

`ComparisonTable.jsx` and `RecommendationCard.jsx` are used both by the public detail page (via `ProductComparisonSection`/`TopPickSection`/`RunnerUpsSection`) and by admin's `LivePreview.jsx` (the Buying Guide form's live preview panel) — the same component instances, not duplicates. Translating them means admin's live preview will also render their Pros/Cons/"Why We Recommend It"/Yes-No text in whatever language is currently active in the browser. This is accepted: these components render the public page's actual UI, and the live preview exists specifically to preview that UI — it should reflect the same translations rather than diverge. Admin pages have no language selector, so in practice this only matters if an admin's browser happens to have a non-English language already active from browsing the public site in the same session.

## Namespace and key structure

New `frontend/src/i18n/locales/<locale>/guides.json` for all 5 locales, following Phase 1's per-locale-folder convention. Components load it alongside `common`: `useTranslation(['common', 'guides'])`.

Key groups:
- `guides.listing.*` — the `/buying-guides` page: description, loading label, empty-state title/description, "no image available", load-error fallback. (The page heading itself reuses `common.nav.buyingGuides`, not a new key.)
- `guides.detail.*` — the detail page shell: loading label, not-found fallback, "Skip to content", table-of-contents heading/aria-label, breadcrumb aria-label.
- `guides.sections.*` — one key per section (`quickRecommendations`, `comparisonTable`, `topPick`, `runnerUps`, `buyingGuide`, `faqs`, `finalRecommendation`). Both `PublishedBuyingGuidePage.jsx`'s TOC-label map and each section component's own heading read from these same keys, so they can't drift out of sync again.
- `guides.hero.*` — the "BUYING GUIDE" badge, byline prefix, "Updated {{date}}".
- `guides.content.*` — "Show less" / "Read more" (custom content card expand toggle).
- `guides.faq.*` — "Show fewer questions" / "View all {{count}} questions".
- `guides.comparison.*` — "Product" column header, "Yes"/"No" cell values, the screen-reader table caption ("Comparison of {{names}}"), the price/availability disclaimer footnote.
- `guides.recommendation.*` — "Untitled Badge" fallback, "Why We Recommend It", "Pros"/"Cons"/"Best For", the two distinct Amazon button texts ("View on Amazon" generic vs. "View {{productName}} on Amazon" product-specific — preserved as two separate strings since the current code already has two different button-text patterns at two different call sites).
- `guides.runnerUps.*` — "Show fewer runner-ups" / "See all reviewed products".

Breadcrumbs (`BuyingGuideBreadcrumbs.jsx`) and the listing page's heading reuse `common.nav.home` / `common.nav.buyingGuides` from Phase 1's `common.json` rather than duplicating those strings into `guides.json`.

**JSON-LD note:** `PublishedBuyingGuidePage.jsx`'s `buildJsonLd()` includes breadcrumb `name` values ("Home", "Buying Guides") in the schema.org structured data. These two reuse the same `common.nav.home`/`common.nav.buyingGuides` keys used for the visible breadcrumb, so the structured data matches the page's displayed language. This is a narrow, low-effort correctness improvement, not full JSON-LD/hreflang localization — that remains Phase 2's responsibility.

## Behavior fix: locale-aware hero date

`BuyingGuideHero.jsx`'s `formatUpdatedDate` currently calls `date.toLocaleDateString('en-US', {...})` unconditionally. It will read the active `i18n.language` (via `useTranslation`) and pass that instead, so the "Updated" byline date renders in the selected language's date format (e.g. `12 ago 2026` in Spanish) rather than always `en-US` formatting regardless of the page's language.

## Components migrated

`src/pages/BuyingGuidesPage.jsx`, `src/pages/PublishedBuyingGuidePage.jsx`, and 14 files under `src/components/buying-guide/`: `BuyingGuideBreadcrumbs`, `BuyingGuideHero`, `GuideTableOfContents`, `QuickRecommendationsSection`, `ProductComparisonSection`, `ComparisonTable`, `TopPickSection`, `RunnerUpsSection`, `RecommendationCard`, `BuyingGuideContentSection`, `BuyingGuideContentCard`, `BuyingGuideFaqSection`, `BuyingGuideFaqAccordion`, `FinalRecommendationSection`.

Not touched: anything under `src/components/buying-guide-form/` (admin wizard), `src/pages/admin/BuyingGuideFormPage.jsx`, and `LivePreview.jsx`'s own hardcoded section headings (it doesn't use the section wrapper components above — only `ComparisonTable` and `RecommendationCard` internally, which do change per the scope decision above).

## Interpolation

Matches i18next's `{{var}}` syntax against the current code's existing interpolation points:
- FAQ accordion: `"View all {{count}} questions"`.
- Comparison table screen-reader caption: `"Comparison of {{names}}"` (product names joined, same as today).
- Final Recommendation button: `"View {{productName}} on Amazon"`.
- Hero byline: `"Updated {{date}}"`.

Everything else is a 1:1 static string swap — no other logic changes (loading/empty/error states, read-more expand/collapse, FAQ accordion behavior, runner-up "see all" toggle, comparison Yes/No icon rendering all stay exactly as they behave today).

## Testing

- Every migrated component's existing test file is read and re-run; since `en-US` values are copied verbatim from the current hardcoded strings, most assertions should pass unchanged (same pattern as Phase 1). Any assertion broken by the `STRUCTURAL_LABELS`-to-shared-key refactor (the TOC label source moving from a static object to `t()` calls) gets fixed to match.
- Full suite + lint + build at the end.
- Manual verification: the listing page and one detail page, in all 5 languages, confirming — TOC labels and section headings stay in sync, the hero byline date renders in the correct per-locale format, comparison table Yes/No and column header translate, FAQ/content expand-collapse text translates, no layout overflow from longer Spanish/Filipino strings.
