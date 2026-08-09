# Public Buying Guide Detail Page Design

## Goal

Replace the stale, broken public buying-guide detail page with a real
implementation that renders every section of an already-published guide
(hero, TOC, Quick Recommendations, Product Comparison, Top Pick,
Runner-Ups, Buying Guide content, FAQs, Final Recommendation) from live
API data, matching the reference design's clean editorial layout. This
closes a gap the SEO & Publish step's design doc explicitly deferred:
*"[the public guide page] is already known broken/incomplete ... out of
scope then and now."* It's in scope now.

## Current reality (confirms scope)

- **The public detail page is broken today, not just unstyled.**
  `BuyingGuideDetailPage.jsx` (route `/buying-guides/:id`) reads
  `guide.content` (the DTO field is actually `introduction`) and renders
  none of quickRecommendations/comparisonTable/topPick/runnerUps/faqs. It
  predates the guide-builder feature entirely.
- **The guide-card → detail-page link is currently broken.**
  `BuyingGuidesPage.jsx` links via `guide.id` (numeric), but the backend
  endpoint (`GET /api/public/buying-guides/{slug}`) does a slug lookup.
  A numeric id will never match a real slug. This is a pre-existing bug,
  fixed as part of this task (not a new requirement being invented).
- **The public API is already most of the way there.**
  `PublicBuyingGuideDetailResponse` already exposes `quickRecommendations`,
  `comparisonTable`, `topPick`, `runnerUps`, `faqs`, and server-filtered
  `tocEntries` (hidden entries already excluded — the public page does not
  need to re-filter). Missing: `focusKeyword`, `canonicalUrl`,
  `visibility`, `robotsIndex`/`robotsFollow`, `openGraphTitle`/
  `openGraphDescription`/`openGraphImageFilename`, `twitterCardType`,
  `publishedAt`, `updatedAt` — all already columns on `BuyingGuide` from
  the SEO & Publish step, just not yet mapped onto the public DTO.
- **`LivePreview.jsx` (the admin editor's live preview) already implements
  ~90% of this page's rendering logic** — hero, numbered TOC, quick recs,
  comparison table, top pick/runner-up cards, buying-guide content cards
  with read-more clamping, FAQ accordion, affiliate disclosure. Several
  pieces are defined inline and not exported
  (`FaqAccordionPreview`, `renderRecommendationCard`,
  `BuyingGuideSectionPreviewCard`, `renderComparisonCellValue`,
  `computeSectionNumbers`), and it's shaped around admin-editor props
  (separate `comparisonSpecs`/`comparisonProducts` arrays, a flat
  `recommendationSections` list) rather than the public API's pre-shaped
  response.
- **No analytics system exists anywhere in the frontend** (confirmed: zero
  matches for `analytics`/`gtag`/`trackEvent`/`dataLayer`).
- **A working, dependency-free meta-tag hook already exists and is in
  active use.** `hooks/useDocumentHead.js` (`title`, `description`,
  `canonicalUrl`, `jsonLd`) is used today by `ComparisonDetailPage.jsx`.
  It does not yet support robots meta, Open Graph, or Twitter Card tags.
- **This is a client-side-rendered SPA with no SSR/SSG.** Meta tags update
  via `document.head` mutation after mount. Real crawlers that execute JS
  (Googlebot does) will see them; a plain HTTP fetch will not. This is an
  architectural ceiling, not something this task changes.
- **No TypeScript** — plain JS/JSX throughout, React Router v6, Tailwind
  with existing tokens (`primary`, `amazon`, `surface`, `border`,
  `heading`, `body`, `success`, `danger`, etc.) and no dedicated "navy" or
  "purple" tokens — the design reuses `primary` (brand accent) and
  `amazon` (CTA orange) rather than inventing new ones.

## Scope decisions (confirmed)

1. **Route stays `/buying-guides/:slug`** (not `/guides/:slug` from the
   prompt's illustrative example) — matches `buildGuideUrl()`, the admin's
   "View Live Guide" link, and every existing canonical-URL computation.
   Changing it would break every already-published guide's live link.
2. **Analytics: minimal internal hook, not a real provider.** No
   analytics system exists today. `trackEvent(name, payload)` logs
   structured events in dev with one clearly-marked swap-in point for a
   real provider (GA4/GTM/etc.) later. Honest partial implementation, not
   a fabricated integration.
3. **Backend DTO extended now**, not deferred — the underlying entity
   fields already exist from the SEO & Publish step; this is exposing
   data, not building new infrastructure.
4. **Meta tags: extend `useDocumentHead`, not a new library.** A working
   pattern already exists and is used by a sibling page
   (`ComparisonDetailPage.jsx`). Adding `react-helmet-async` would create
   two different meta-tag systems on the public site. Robots/OG/Twitter
   support is added to the existing hook in place.
5. **No Product/Offer JSON-LD.** Real `rating`/`reviewCount` data exists
   on products, but valid Product rich-result markup requires price +
   availability + a valid offer, and the spec explicitly warns against
   inventing offer/availability data. `Article` schema is used instead
   (headline/description/image/datePublished/dateModified/author).
   Deferred, not faked.
6. **No SSR/prerendering.** Stays a CSR SPA — the existing rendering
   architecture's real ceiling, not a gap papered over.
7. **No responsive `srcset`/multi-format images.** The backend stores one
   original file per upload; nothing generates additional sizes/formats.
   A `srcset` pointing at images that don't exist would be worse than
   none. Hero image gets `loading="eager"`, everything below the fold
   gets `loading="lazy"`.
8. **No new caching layer.** None exists in front of
   `/api/public/buying-guides/*` today; none is introduced.
9. **Archived products are not hidden.** A product's `active` flag governs
   *admin* listing eligibility, not whether an already-published guide can
   still reference it. Adding hide-on-inactive logic here risks a
   surprising bug where an unrelated admin toggle silently breaks a live,
   already-published guide. Not implemented.

## Architecture

### Routing & data fetching

- Fix `App.jsx`'s route param name (`:id` → `:slug`) and the page's
  `useParams()` accordingly.
- Fix `BuyingGuidesPage.jsx`'s `Link to` to use `guide.slug` instead of
  `guide.id`.
- Rename `getBuyingGuideById(id)` → `getBuyingGuideBySlug(slug)` in
  `services/buyingGuideService.js` (same endpoint, correctly named).
- `PublishedBuyingGuidePage.jsx` replaces `BuyingGuideDetailPage.jsx`,
  following the exact loading/error pattern already used by
  `ComparisonDetailPage.jsx`: local `isLoading`/`error` state, `getSettings()`
  for the footer, `LoadingSpinner`/`ErrorState` for loading/not-found
  (backend already makes draft/private/nonexistent guides indistinguishable
  — one generic "not found" message covers all three, by design, no info
  leak).

### Backend changes

Extend `PublicBuyingGuideDetailResponse` and
`BuyingGuideMapper.toPublicDetail()` with: `focusKeyword`, `canonicalUrl`,
`visibility`, `robotsIndex`, `robotsFollow`, `openGraphTitle`,
`openGraphDescription`, `openGraphImageFilename`, `twitterCardType`,
`publishedAt`, `updatedAt`. Additive change mirroring the existing mapper
pattern; no new tables, no migration.

### Component extraction from `LivePreview.jsx`

Extract the currently-inline pieces into standalone, exported components
under a new `frontend/src/components/buying-guide/` folder (sibling to
the admin-only `buying-guide-form/`), each taking the **public API's**
shape directly rather than admin-editor-shaped props:

| New shared component | Extracted from | Public API input |
|---|---|---|
| `RecommendationCard.jsx` | `renderRecommendationCard` | one `PublicBuyingGuideRecommendationSectionResponse` |
| `ComparisonTable.jsx` | comparison JSX + `renderComparisonCellValue` | `PublicBuyingGuideComparisonTableResponse` |
| `BuyingGuideFaqAccordion.jsx` | `FaqAccordionPreview` | `PublicBuyingGuideFaqResponse[]` |
| `BuyingGuideContentCard.jsx` | `BuyingGuideSectionPreviewCard` | one TOC entry (title/content/anchorId) |
| `AmazonAffiliateButton.jsx` | new | product name + URL |

`computeSectionNumbers` is extracted into a pure, unit-tested util
(`utils/computeGuideSectionNumbers.js`) used by both `LivePreview.jsx` and
the public page, so TOC, headings, anchors, and visible numbering cannot
drift out of sync — they're computed by the same function, not kept in
sync by convention.

`LivePreview.jsx` is then updated to import these same components instead
of its inline versions. Same rendered output (verified by its existing
test suite passing unchanged), but one source of truth for both the admin
preview and the public page.

`AmazonAffiliateButton.jsx` is a thin wrapper around the existing
`Button` component (`variant="amazon"`, already used this way in
`ComparisonDetailPage.jsx`): validates the URL via the existing
`isSupportedAmazonUrl()` (https + allowlisted Amazon hostnames — already
preserves "the configured Amazon marketplace" and rejects unverified
domains), renders a disabled/hidden fallback when invalid, sets
`aria-label` to include the product name, and always sets
`rel="nofollow sponsored noopener noreferrer"` + `target="_blank"`.

### Page composition

```
<Navbar /> (existing, sticky, ~72px)
skip-to-content link
<main id="main-content">
  <BuyingGuideBreadcrumbs />           Home > Buying Guides > {title}
  <BuyingGuideHero>                    title, excerpt, byline, date, image
    <GuideTableOfContents />           sticky sidebar (xl+) / collapsible (below xl)
  </BuyingGuideHero>
  <AffiliateDisclosure />              before first affiliate link
  <QuickRecommendationsSection />
  <ProductComparisonSection />
  <TopPickSection />
  <RunnerUpsSection />
  <BuyingGuideContentSection />
  <BuyingGuideFaqSection />
  <FinalRecommendationSection />
</main>
<Footer settings={settings} />         (existing)
```

### Dynamic section numbering & TOC

`computeGuideSectionNumbers(tocEntries, { hasQuickRecommendations,
hasComparison, hasTopPick, hasRunnerUps, hasBuyingGuideContent, hasFaqs,
hasFinalRecommendation })` walks the server-filtered `tocEntries` in
persisted order, assigning sequential numbers only to sections that both
exist in the TOC and have real content — identical algorithm to
`LivePreview.jsx`'s existing `computeSectionNumbers`, just fed booleans
derived from the public API's shape instead of admin-editor arrays.

TOC entries render as real `<a href="#anchor">` links (not buttons faking
navigation). Click → `scrollIntoView({ behavior: prefersReducedMotion ?
'auto' : 'smooth', block: 'start' })` + `history.replaceState` for the
hash (no reload). Every section anchor gets `scroll-mt-24` to clear the
sticky `Navbar`. Active-section highlighting via `IntersectionObserver`,
setting `aria-current="true"` on the corresponding TOC link. Anchor IDs
for custom Buying Guide sections reuse the existing collision-safe
`uniqueSlug()` util.

Desktop (xl+): TOC is a sticky sidebar beside the hero, matching the
reference image. Below xl: a collapsible control (details/summary or a
toggle button), not rendered as a sidebar.

### Final Recommendation — no dedicated backend field

There is no `FINAL_RECOMMENDATION` section key or saved field for this.
Per the spec's own fallback instruction, it's derived from the existing
Top Pick data — heading "Final Recommendation," a short summary from
`topPick.whyRecommended` (stripped of markup, not new AI-generated
copy), and a CTA reading "View {topPick.product.name} on Amazon." It only
renders (and only appears in the TOC/numbering) when a Top Pick exists —
no Top Pick means the section is absent, not a blank card.

### SEO metadata & structured data

`useDocumentHead` is extended (in place, preserving existing behavior) to
also accept `robots`, `ogTitle`, `ogDescription`, `ogImage`, `ogType`,
`ogUrl`, `twitterCard`, `twitterTitle`, `twitterDescription`,
`twitterImage` — each created and cleaned up in the effect exactly like
the existing `description`/`canonical` tags.

Value derivation mirrors `AdvancedSeoPanel.jsx`'s existing admin-side
fallback logic:

- `title` = `seoTitle || title`; `description` = `seoDescription || excerpt`
- `canonical` = `canonicalUrl || buildGuideUrl(slug)` (existing util)
- `robots` = derived from `robotsIndex`/`robotsFollow`
- OG/Twitter title/description = `openGraph* || seo* || basic-info value`;
  image = `getImageUrl(openGraphImageFilename || coverImageFilename)`
- `twitterCard` = `twitterCardType || 'summary_large_image'`

Structured data passed as the hook's existing `jsonLd` array (already
supports multiple schemas):

1. `BreadcrumbList` — mirrors `ComparisonDetailPage.jsx`'s existing
   `buildJsonLd` pattern exactly.
2. `Article` — headline, description, image, `datePublished` (from the
   new `publishedAt`), `dateModified` (from the new `updatedAt`),
   `author: { "@type": "Organization", "name": "2Go Findz" }`.
3. `FAQPage` — only when `faqs.length > 0`, reusing the existing
   `buildFaqJsonLd()` util unchanged (guaranteed to match visible content
   since it's built from the same array being rendered).

### Analytics hook

`hooks/useAnalytics.js` exports `trackEvent(name, payload = {})`. Events:
`guide_view` (fires once per mount via a ref guard, preventing
StrictMode-dev-double-invoke duplicates), `toc_click`,
`quick_pick_affiliate_click`, `comparison_product_click`,
`top_pick_affiliate_click`, `runner_up_affiliate_click`,
`final_recommendation_click`, `faq_expand`, `buying_guide_expand`. Payload
includes `guideId`, `productId` (where applicable), `section`,
`placement`, and `marketplace` (derived from the Amazon hostname). No
sensitive personal data is ever included.

## Rendering sections → data mapping

| Section | Source data | Notes |
|---|---|---|
| Breadcrumbs | `title` | Home/Buying Guides links, `aria-current="page"` on last crumb, truncates on small screens |
| Hero | `title`, `excerpt`, `coverImageFilename`, `updatedAt` | Byline is the existing static "By 2Go Findz Team" (no per-guide author field exists; matches `LivePreview.jsx`'s current behavior) |
| Featured image | `coverImageFilename` via `getImageUrl` | alt = guide title (no separate alt-text field exists on the entity); reserves aspect ratio to avoid layout shift; hidden entirely (not a broken `<img>`) when absent |
| Affiliate disclosure | `settings.affiliateDisclosure` | Reuses existing `AffiliateDisclosure.jsx` as-is, placed before the first affiliate CTA |
| Quick Recommendations | `quickRecommendations[]` | badge, image, name, price, rating/reviewCount when present, `AmazonAffiliateButton`; grid: 5 cols xl / 2-3 tablet / 1-2 mobile |
| Product Comparison | `comparisonTable` | `ComparisonTable.jsx`, dark header (`bg-slate-900`-family, no dedicated navy token exists), horizontal-scroll wrapper, price notice shown only if price is displayed |
| Top Pick | `topPick` | `RecommendationCard.jsx` |
| Runner-Ups | `runnerUps[]` | `RecommendationCard.jsx` grid, 2 cols desktop / stacked mobile; "See all reviewed products" only rendered when more exist than the initial visible count |
| Buying Guide content | custom (non-structural) `tocEntries` | `BuyingGuideContentCard.jsx`, per-card read-more clamp (matches `LivePreview.jsx`) |
| FAQs | `faqs[]` | `BuyingGuideFaqAccordion.jsx`, first 5 + "View all N questions" |
| Final Recommendation | `topPick` (derived, see above) | absent entirely when no Top Pick |

## Accessibility

Single `h1` (guide title); `h2` per major section, `h3` at card level;
skip-to-content link; `<nav aria-label>` landmarks for breadcrumbs and
TOC; real alt text on informative images, empty alt on decorative ones;
`aria-label` on icon-only controls; full keyboard navigation (TOC links
are real `<a>`, FAQ toggles are real `<button>`, comparison table is
semantic `<table>` with `scope="row"/"col"` and a caption — all already
established patterns from `LivePreview.jsx`); `prefers-reduced-motion`
respected for scroll behavior; existing `focus:ring-2 focus:ring-primary`
pattern reused for visible focus states; anchor IDs collision-safe via
the existing `uniqueSlug()` util.

## Responsive behavior

xl+: side-by-side hero content/image, sticky TOC sidebar, quick picks up
to 5 columns, Top Pick/Runner-Ups in a balanced 2-column layout. Below
xl: TOC becomes a collapsible control and everything stacks to one
column — matching the codebase's existing `sm/lg/xl` breakpoint
convention (no bespoke intermediate `md` tuning). Comparison table scrolls
horizontally inside its own wrapper; the page itself never overflows
horizontally.

## Error & fallback states

Loading spinner (existing `LoadingSpinner`); not-found/unavailable
(existing `ErrorState`, one message covers draft/private/nonexistent by
the backend's existing design); failed request gets a retry action
(`ErrorState` gains an optional `onRetry` prop if it doesn't already have
one); missing hero/product images render nothing rather than a broken
`<img>` (existing `getImageUrl` null-guard pattern); invalid affiliate
links render `AmazonAffiliateButton`'s disabled state instead of a dead
link; missing comparison values show an em dash (existing
`renderComparisonCellValue` behavior); every empty optional section is
hidden entirely, never a blank card; no client hydration boundary exists
to handle (CSR SPA, no SSR).

## Testing plan

- Unit tests for every new/extracted component
  (`RecommendationCard`, `ComparisonTable`, `BuyingGuideFaqAccordion`,
  `BuyingGuideContentCard`, `AmazonAffiliateButton`,
  `GuideTableOfContents`), `computeGuideSectionNumbers`, the new
  `useDocumentHead` fields, and `useAnalytics`.
- `PublishedBuyingGuidePage.jsx` test: loading/error/not-found, full
  render with every section, correct renumbering when optional sections
  are missing, breadcrumb, meta-tag assertions against `document.head`,
  affiliate-link validity (valid → real `href`+`rel`; invalid → disabled).
- Backend: extend the existing public controller tests to assert the new
  DTO fields round-trip through `GET /api/public/buying-guides/{slug}`.
- Confirm `LivePreview.jsx`'s existing test suite passes unchanged after
  the extraction refactor (proves it's behavior-preserving).
- Manual browser verification: a fully-populated published guide, a
  sparse guide missing several optional sections, an Unlisted guide
  (reachable by slug, absent from the listing), a Draft/Private guide
  (not found), at desktop/tablet/mobile, keyboard-only navigation through
  TOC/FAQ/comparison table, and a console-error check.

## Files created

- `frontend/src/pages/PublishedBuyingGuidePage.jsx` (+ test) — replaces
  `BuyingGuideDetailPage.jsx`
- `frontend/src/components/buying-guide/BuyingGuideBreadcrumbs.jsx` (+ test)
- `frontend/src/components/buying-guide/BuyingGuideHero.jsx` (+ test)
- `frontend/src/components/buying-guide/GuideTableOfContents.jsx` (+ test)
- `frontend/src/components/buying-guide/QuickRecommendationsSection.jsx` (+ test)
- `frontend/src/components/buying-guide/ProductComparisonSection.jsx` (+ test)
- `frontend/src/components/buying-guide/ComparisonTable.jsx` (+ test)
- `frontend/src/components/buying-guide/TopPickSection.jsx` (+ test)
- `frontend/src/components/buying-guide/RunnerUpsSection.jsx` (+ test)
- `frontend/src/components/buying-guide/RecommendationCard.jsx` (+ test)
- `frontend/src/components/buying-guide/BuyingGuideContentSection.jsx` (+ test)
- `frontend/src/components/buying-guide/BuyingGuideContentCard.jsx` (+ test)
- `frontend/src/components/buying-guide/BuyingGuideFaqSection.jsx` (+ test)
- `frontend/src/components/buying-guide/BuyingGuideFaqAccordion.jsx` (+ test)
- `frontend/src/components/buying-guide/FinalRecommendationSection.jsx` (+ test)
- `frontend/src/components/AmazonAffiliateButton.jsx` (+ test)
- `frontend/src/utils/computeGuideSectionNumbers.js` (+ test)
- `frontend/src/hooks/useAnalytics.js` (+ test)

## Files deleted

- `frontend/src/pages/BuyingGuideDetailPage.jsx` and
  `BuyingGuideDetailPage.test.jsx` — fully replaced by
  `PublishedBuyingGuidePage.jsx` (+ its own test), not kept alongside it.

## Files modified

- `frontend/src/App.jsx` — route param `:id` → `:slug`, import swapped to `PublishedBuyingGuidePage`
- `frontend/src/pages/BuyingGuidesPage.jsx` — link by `guide.slug`, not `guide.id`
- `frontend/src/services/buyingGuideService.js` — `getBuyingGuideById` → `getBuyingGuideBySlug`
- `frontend/src/hooks/useDocumentHead.js` (+ test) — add robots/OG/Twitter support
- `frontend/src/components/buying-guide-form/LivePreview.jsx` (+ test) — import extracted shared components instead of inline versions; behavior-preserving refactor
- `frontend/src/components/ErrorState.jsx` — optional `onRetry` prop, if not already present
- `backend/.../dto/response/PublicBuyingGuideDetailResponse.java` — new SEO fields
- `backend/.../mapper/BuyingGuideMapper.java` (+ test) — map new fields in `toPublicDetail`
- `backend/.../controller/publicapi/PublicBuyingGuideControllerTest.java` — assert new fields

## Explicitly out of scope

1. Product/Offer JSON-LD (Article schema used instead)
2. SSR/prerendering (stays CSR)
3. Responsive `srcset`/multi-format images (backend stores one file per upload)
4. A response-caching layer for the public API
5. A real analytics provider (hook is ready, no provider wired)
6. Hiding content based on a referenced product's `active` flag
