# Public Homepage Redesign Design

## Goal

Redesign the existing public homepage (`frontend/src/pages/HomePage.jsx`) to match
a supplied reference image: a dark navy header/footer, a left-content/right-image
hero with trust cards, a social strip, carousel-driven Featured Products, a
two-column Trending/Best Sellers section, a category grid, a promo banner, and a
5-column dark footer — while preserving every real data source, route, and
behavior the current homepage already has, and being explicit (not silently
inventive) about the several features the reference implies that don't exist
anywhere in this codebase yet.

## Current reality (confirms scope)

- **The homepage is structurally closer to the reference than it looks.** It
  already has featured/trending/best-sellers/category-grid/footer sections in
  roughly the right order — but every "teaser" section renders as a static
  wrap-grid (`ProductGrid`, 2–4 cols), not a carousel, there's no promo banner,
  and two extra sections (`Why Shop with 2Go Findz`, a second social-links
  block) exist that aren't in the reference at all.
- **`Navbar.jsx` is shared site-wide, not homepage-scoped** — every public page
  (`TrendingPage`, `CategoriesPage`, `BestSellersPage`, `ComparePage`,
  `PublicBuyingGuidesPage`, `PublishedBuyingGuidePage`, `PublicComparisonsPage`,
  `ComparisonDetailPage`) imports the same file. Restyling it dark is a
  site-wide header change, not a homepage-only one.
- **`Footer.jsx` is similarly shared and currently a single light, centered
  column** — no multi-column layout exists to build on. It's imported by 7
  files, not just `HomePage.jsx`: `CatalogPage.jsx` (a shared wrapper already
  used by `TrendingPage`, `BestSellersPage`, and `CategoriesPage` — and,
  discovered only while researching this plan, the exact existing block the
  spec's "extract the catalog to `/products`" decision (4) can reuse instead
  of duplicating), plus `BuyingGuidesPage.jsx`, `ComparePage.jsx`,
  `ComparisonDetailPage.jsx`, `ComparisonsPage.jsx`, and
  `PublishedBuyingGuidePage.jsx`. All 7 call sites pass the identical
  `<Footer settings={settings} />`, so swapping to `<PublicFooter
  settings={settings} />` is a pure drop-in replacement everywhere.
- **No carousel infrastructure exists anywhere** (`grep` for
  carousel/swiper/embla/keen-slider across `frontend/src` and `package.json`:
  zero matches). Every "carousel" in the reference is a static grid today.
- **No navy/dark color tokens exist** in `tailwind.config.js` — only the
  existing light palette (`primary`, `amazon`, `surface`, `border`, `heading`,
  `body`, etc.).
- **The existing `ProductCard.jsx` is too heavy for the reference's homepage
  cards.** It always renders a description, a "Check Price" Amazon button,
  and a Compare-toggle button (`frontend/src/components/ProductCard.jsx`).
  The reference's homepage cards show only an image and a name — no
  description, no visible button, no compare affordance — matching the
  spec's own explicit instruction ("do not display ratings or prices in this
  homepage section") and its suggested component list, which names
  `HomepageProductCard` as its own component distinct from the general one.
- **Trending and Best Sellers are real backend boolean flags**
  (`Product.trending` / `Product.bestSeller`, `backend/.../entity/Product.java`
  lines 55-59), already wired end-to-end via `searchProducts({ trending: true })`
  / `searchProducts({ bestSeller: true })`. **"Featured" has no backend concept**
  — the homepage currently fakes it as `sort: 'createdAt,desc'` (newest first).
- **Four features the reference visually implies do not exist anywhere**:
  a real global search bar (only a `/#catalog`-scroll icon-link exists today),
  a saved/wishlist feature (no context, hook, or storage), a public-facing
  account/auth system (only admin auth exists — `AuthContext.jsx` guards only
  `/admin/*`), and newsletter signup (deliberately deferred already — a
  commented-out `<NewsletterSignup />` with `// TODO: Enable newsletter
  functionality in a future deployment` sits in `Footer.jsx` today).
- **The reference's "Browse All Products" is a compact promo banner**, not the
  homepage's current full filterable catalog (`SearchInput` + `ProductFilters`
  + `ProductGrid` + `Pagination`, all inline at `#catalog`). No `/products`
  route exists today for that catalog to live at instead.
- **The reference's footer links to 8 destinations with no existing route**:
  Deals (nav + footer), Reviews, Gift Ideas, New Arrivals, About Us, Contact
  Us, Privacy Policy, Terms of Use, Affiliate Disclosure (as a dedicated page
  — the *component* `AffiliateDisclosure.jsx` already exists and is reused
  elsewhere, just not as its own page).
- **The reference's social strip includes Facebook**, but `SystemSettings`
  (`backend/.../entity/SystemSettings.java` lines 37-46) only has
  `tiktokUrl`/`pinterestUrl`/`instagramUrl`/`youtubeUrl` — no Facebook field.
- **`ProductCategory` has no image field at all** (confirmed:
  `backend/.../entity/ProductCategory.java` has no image column) — the
  existing `CategoryCard.jsx` is text-only today. The reference shows
  category cards with photos, but adding real per-category image upload
  (entity + migration + DTO + admin upload UI) is a meaningfully bigger
  backend feature than the one-field `facebookUrl` addition, not a
  "redesign the homepage" change.
- **`SocialLinks.jsx`'s platform list (including its custom TikTok/Pinterest
  SVG icons) is a local, unexported constant** inside that one file — there's
  nothing for a new `SocialMediaStrip.jsx` to import without either
  duplicating the icon SVGs or extracting the list first.

## Scope decisions (confirmed)

1. **Navbar restyled dark navy in place, site-wide.** One consistent header
   across the whole public site, matching how the reference clearly intends
   the brand to look everywhere — not a homepage-only fork.
1a. **Footer replaced site-wide too, confirmed explicitly** (`Footer.jsx` →
    `PublicFooter.jsx` at all 7 import sites: `CatalogPage.jsx`,
    `HomePage.jsx`, `BuyingGuidesPage.jsx`, `ComparePage.jsx`,
    `ComparisonDetailPage.jsx`, `ComparisonsPage.jsx`,
    `PublishedBuyingGuidePage.jsx`) — same site-wide-consistency reasoning as
    decision 1, and the same identical `settings` prop at every call site
    makes it a mechanical swap, not a redesign of those other pages.
2. **New `navy` color tokens added** to `tailwind.config.js` (950/900/800),
   additive alongside the existing palette — product cards, buttons, and every
   other page keep their current light-theme colors outside the header/footer.
3. **"Deals" is dropped** from both nav and footer — no route or backend
   concept backs it, and a dead link would be worse than its absence.
3a. **"Best Sellers" and "Comparisons" are dropped from the navbar** (the
    reference's nav has exactly 5 items: Home, Trending, Categories, Compare,
    Buying Guides). Best Sellers stays reachable via the footer's Shop column
    (it's in the reference's footer) and its own homepage section. Comparisons
    doesn't appear anywhere in the reference (nav or footer) — its route
    (`/comparisons`) and page are untouched and still fully reachable by
    direct link, just not advertised in the new nav or footer.
4. **The full filterable catalog is extracted to a new `/products` route by
   reusing the existing shared `CatalogPage.jsx`** (already used by
   `TrendingPage`/`BestSellersPage`/`CategoriesPage` for exactly this same
   `SearchInput` + `ProductFilters` + `ProductGrid` + `Pagination` block) —
   `AllProductsPage.jsx` becomes a thin wrapper (`<CatalogPage title="All
   Products" description="Search, filter, and sort our full catalog." />`),
   not a duplicated copy of the markup. The homepage's `#catalog` section is
   replaced by the reference's compact `BrowseProductsBanner` linking to
   `/products`.
5. **`HeroSection.jsx` is fully replaced**, not incrementally modified — the
   current centered/floating-blob layout is structurally incompatible with the
   reference's left-content/right-image split. It's used only by
   `HomePage.jsx` (confirmed via repo-wide search), so the old component and
   its test are deleted, not left orphaned.
6. **"Why Shop with 2Go Findz" and the second social-links block are dropped**
   — they're not in the reference's section order, and the primary objective
   is to "build the homepage in this exact order."
7. **Search is built for real**: the navbar's dark search input submits on
   Enter and navigates to `/products?search=<query>`, reusing the existing
   `useProductSearch` hook and `searchProducts` service — no new backend work,
   just a real input wired to infrastructure that already exists.
8. **Saved/Wishlist and public Account/Auth are out of scope for this pass.**
   Both are omitted entirely from the navbar (not shown disabled, not
   shown at all) rather than rendered as non-functional icons — consistent
   with the project's established pattern of honest omission over fake
   affordances.
9. **Newsletter stays without a real backend**, but the footer's form is real
   and honest: a working `<form>` with a real email `<input>` and Subscribe
   `<button>` that, on submit, shows a clear "Newsletter signup isn't
   available yet" message — not a silent no-op and not a faked success state.
10. **"Featured Products" keeps the existing newest-first behavior** — no new
    backend `featured` flag. Scoped to visuals/layout, not new curation
    concepts.
10a. **Category cards use a generic icon on a soft tinted background**, not
    a real per-category photo — matching the reference's "soft tinted
    background behind each image" visual treatment honestly, without
    fabricating category photos or building new image-upload infrastructure.
    A small icon lookup (by category name keyword, generic fallback icon
    otherwise) using the existing `lucide-react` dependency — no new asset
    pipeline.
11. **A real `facebookUrl` field is added to `SystemSettings`** (migration +
    entity + DTO + admin settings form field) — this is the one small,
    purely-additive backend change in an otherwise frontend-only task,
    mirroring the four URL fields that already exist there exactly.
12. **Minimal real static pages are added for About Us, Contact Us, Privacy
    Policy, Terms of Use, and Affiliate Disclosure** — genuinely brief,
    honest content (not lorem ipsum, not dead `#` links). Affiliate
    Disclosure's page reuses the existing `AffiliateDisclosure.jsx`
    text/component almost verbatim.
13. **"Reviews" and "Gift Ideas" are omitted** from the footer — no concept
    backs either anywhere in the data model. **"New Arrivals" links to
    `/products?sort=createdAt,desc`** — the same real newest-first data
    already used for "Featured," honestly labeled.

## Architecture

### Design tokens (`frontend/tailwind.config.js`)

Add a `navy` color family:

```js
navy: {
  950: '#020d18',
  900: '#071426',
  800: '#0b1c33',
},
```

(Matching the reference image's near-black header/footer tone; exact hex
values tuned during implementation against the reference screenshot per the
visual-accuracy workflow below.) Existing tokens (`primary`, `amazon`,
`surface`, `border`, `heading`, `body`, radii, shadows) are untouched — they
still govern every light-themed surface (product cards, buttons, section
cards).

### Routing (`frontend/src/App.jsx`)

- Add `<Route path="/products" element={<AllProductsPage />} />` — `AllProductsPage`
  is a thin wrapper around the existing shared `CatalogPage.jsx` (see scope
  decision 4), replacing the `#catalog` block currently inline in
  `HomePage.jsx`.
- Add minimal static routes: `/about`, `/contact`, `/privacy-policy`,
  `/terms-of-use`, `/affiliate-disclosure`.
- No other existing routes change.

### New components (`frontend/src/components/home/`)

A new folder for homepage-specific pieces, mirroring how `buying-guide/` was
split out from `buying-guide-form/` in earlier work — keeps homepage-only UI
out of the general `components/` folder.

| Component | Responsibility |
|---|---|
| `HomeHero.jsx` | Left content (badge, 2-line headline, description, 2 CTAs, avatar row + stat line) + right image with two `HeroTrustCard`s |
| `HeroTrustCard.jsx` | Small floating white card (icon, title, subtitle) — reused for "Top Rated" and "Handpicked" |
| `SocialMediaStrip.jsx` | Horizontal strip: platform icon + name + handle, vertical separators, renders only configured platforms |
| `HomeSectionCard.jsx` | White-card wrapper: icon + title + supporting text + "View all →" link on the right — used by Featured/Trending/Best Sellers/Shop by Category |
| `ProductCarousel.jsx` | CSS scroll-snap horizontal container + prev/next `<button>`s, boundary-aware disabled state, wraps `HomepageProductCard.jsx` items |
| `HomepageProductCard.jsx` | Minimal card: image + name only, the whole card is a real `<a>` to `product.productLink` (real Amazon URL, `target="_blank"` + `rel="nofollow sponsored noopener noreferrer"`, calls the existing `recordClick` tracking service on click — same link/tracking behavior as `ProductCard.jsx`'s "Check Price," just without the visible button/description/compare-toggle chrome) |
| `CompactProductRow.jsx` | Thumbnail + name row, same real-link-and-tracking behavior as `HomepageProductCard.jsx`, used inside Trending/Best Sellers |
| `TrendingRightNowSection.jsx` | 3 `CompactProductRow`s + 1 larger image (first trending product), inside `HomeSectionCard` |
| `BestSellersSection.jsx` | 3 `CompactProductRow`s only, inside `HomeSectionCard` — deliberately asymmetric with Trending, matching the reference |
| `CategoryGridSection.jsx` | Responsive grid of `HomeCategoryCard.jsx`, inside `HomeSectionCard` |
| `HomeCategoryCard.jsx` | Icon (soft tinted background) + category name, entire card is a real link to `/categories?category={id}`. A new component, not a modification of `CategoryCard.jsx` — that component is also used by `CategoriesPage.jsx`, which is out of scope for this redesign |
| `BrowseProductsBanner.jsx` | Promo banner: two decorative placeholder images + copy + button → `/products` |
| `PublicFooter.jsx` | Replaces `Footer.jsx`: dark 5-column layout (Brand/Shop/Discover/Company/Newsletter) |
| `NewsletterForm.jsx` | Real form, honest "not available yet" message on submit (see scope decision 9) |

### Reused as-is

`ProductCard.jsx` (still used by the new `/products` page, unchanged),
`CategoryCard.jsx` (unchanged — still used by `CategoriesPage.jsx`, out of
scope for this redesign), `Badge.jsx`, `useProductSearch.js`,
`productService.js`, `categoryService.js`, `settingsService.js`,
`AffiliateDisclosure.jsx` (reused by the new `/affiliate-disclosure` page).

`SocialLinks.jsx`'s platform metadata (label, settings key, icon — including
its custom TikTok/Pinterest SVGs) is extracted into a new shared
`frontend/src/utils/socialPlatforms.js` exporting a `SOCIAL_PLATFORMS` array,
with a Facebook entry added to that one list. Both `SocialLinks.jsx` (updated
to import from there instead of its own local array) and the new
`SocialMediaStrip.jsx` consume the same list — one source of truth, Facebook
support added once, no duplicated icon code.

### Modified

- `Navbar.jsx` — dark navy restyle in place; nav items become Home / Trending
  / Categories (existing dropdown) / Compare (existing badge) / Buying
  Guides; the existing search icon-link is replaced with a real dark search
  `<input>` that submits to `/products?search=...`; Saved/Account are not
  added (scope decision 8).
- `MobileMenu.jsx` — extended (not replaced) with real focus-trap-and-restore
  (a genuine accessibility gap in the current drawer, worth fixing while
  touching this file) and an updated nav item list matching the new Navbar.
- `HomePage.jsx` — rebuilt to the reference's exact 8-section order, sourcing
  each section from the same real data the current page already fetches
  (`getSettings`, `getCategories`, `searchProducts` with `trending`/
  `bestSeller` params), minus the `#catalog` block (moved to `/products`) and
  the two dropped sections.
- `CatalogPage.jsx` (+ test) — swaps `Footer` for `PublicFooter`; this one
  change is what makes `TrendingPage`, `BestSellersPage`, `CategoriesPage`,
  and the new `AllProductsPage` all pick up the dark footer.
- `BuyingGuidesPage.jsx`, `ComparePage.jsx`, `ComparisonDetailPage.jsx`,
  `ComparisonsPage.jsx`, `PublishedBuyingGuidePage.jsx` (each + test) — same
  mechanical `Footer` → `PublicFooter` swap, identical `settings` prop,
  confirmed as an explicit site-wide decision (1a).
- `backend/.../entity/SystemSettings.java`,
  `dto/response/SettingsResponse.java`, `dto/request/SettingsRequest.java`,
  `mapper/SettingsMapper.java`, admin settings form component — add
  `facebookUrl` end-to-end, mirroring the existing 4 URL fields exactly.

### Deleted

- `HeroSection.jsx` and `HeroSection.test.jsx` — fully replaced by `HomeHero.jsx`,
  confirmed unused elsewhere.
- `Footer.jsx` and its test — fully replaced by `PublicFooter.jsx`.

### Hero placeholder image

```ts
// Temporary hero image: replace this source with the final 2Go Findz hero asset.
const HOME_HERO_IMAGE = '/images/home/hero-placeholder.webp';
```

A single generated local asset (warm ivory/beige/soft-gray palette, no
embedded text, no copyrighted logos, aspect ratio matching the reference's
hero art) at `frontend/public/images/home/hero-placeholder.webp`, referenced
only via this one constant inside `HomeHero.jsx` — never a scattered literal
path.

### Promotional/unverified content

```ts
// homeContent.js — promotional copy shown on the homepage hero. These are
// marketing statements, not verified real-time statistics (the site has no
// aggregate review/shopper-count system). Edit here, not inline in HomeHero.jsx.
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

Avatar row: simple decorative circles (solid color + initial, or a neutral
person silhouette), not photos — the public site has no user-account system
to source real customer photos from, and using generic stock/AI photos would
misrepresent them as real customers.

## Rendering sections → data mapping

| Section | Source | Notes |
|---|---|---|
| Navbar | `getCategories()` (existing dropdown) | Dark restyle, real search wired to `/products` |
| Hero | `HOME_HERO_CONTENT` config + `HOME_HERO_IMAGE` constant | CTAs are real routes (`/trending`, `/categories`) |
| Social strip | `getSettings()` (`tiktokUrl`/`pinterestUrl`/`instagramUrl`/`youtubeUrl`/new `facebookUrl`) | Section hidden entirely if none configured |
| Featured Products | `searchProducts({ sort: 'createdAt,desc' })` | Existing "featured" stand-in, now in a carousel |
| Trending Right Now | `searchProducts({ trending: true })` | 3 rows + 1 large image (first item) |
| Best Sellers | `searchProducts({ bestSeller: true })` | 3 rows only |
| Shop by Category | `getCategories()` | Real API order, not the reference's specific 8 names |
| Browse All Products banner | static copy + link | → `/products` |
| Footer | `getSettings()`, static route links | Real links only; Deals/Reviews/Gift-Ideas omitted, New Arrivals → `/products?sort=createdAt,desc` |

## Accessibility

Single `h1` (hero headline); proper heading hierarchy through section titles;
skip-to-content link; semantic `<header>`/`<nav>`/`<main>`/`<section>`/
`<footer>`; real `<button>`s for carousel arrows and the mobile menu toggle
(never clickable `div`s); accessible names on icon-only controls (search
submit, social icons, carousel arrows); full keyboard operability (carousel
arrows are real focusable buttons; the mobile drawer traps and restores
focus — fixing a real gap in the current `MobileMenu.jsx`); visible focus
rings tuned to stay visible against the new navy backgrounds;
`prefers-reduced-motion` respected for carousel scrolling and hover
transforms.

## Responsive behavior

Verified at 1536/1440/1280/1024/768/390/375px. Desktop: full nav, side-by-side
hero, ~5 carousel cards visible, Trending/Best Sellers side by side, up to 8
category cards visible. Tablet: nav may collapse into the drawer earlier,
hero proportions adjust, carousel shows fewer cards, Trending/Best Sellers
may stack. Mobile: drawer nav, stacked hero (image below content),
touch-friendly CTAs, carousel shows 1–2 cards via native touch scroll-snap,
category grid 2 columns, footer columns stack vertically (not accordions —
consistent with how the rest of the site already handles mobile footers, no
new interaction pattern introduced). No page-level horizontal overflow at
any breakpoint.

## Performance

Hero image `loading="eager"` with reserved dimensions (above the fold);
carousel/category images `loading="lazy"`; no new client-side dependencies —
the carousel is CSS `scroll-snap` plus a small amount of JS for arrow
disabled-state, not a library; existing image-URL resolution (`getImageUrl`)
reused unchanged.

## Testing plan

- Unit tests for every new component (`HomeHero`, `HeroTrustCard`,
  `SocialMediaStrip`, `HomeSectionCard`, `ProductCarousel`,
  `CompactProductRow`, `TrendingRightNowSection`, `BestSellersSection`,
  `CategoryGridSection`, `BrowseProductsBanner`, `PublicFooter`,
  `NewsletterForm`, and the 5 new static pages).
- `HomePage` integration test covering the full 8-section order and each
  section's real-data wiring (including the "section hidden when no data"
  cases already established elsewhere in the codebase).
- `AllProductsPage` test confirming it renders `CatalogPage` with the "All
  Products" title/description (the filter/search/pagination behavior itself
  is already covered by `CatalogPage.test.jsx`, unchanged).
- `Navbar.test.jsx` updated for the dark restyle, dropped Deals item, and the
  new real search input.
- `MobileMenu` focus-trap-and-restore test (new coverage for an existing gap).
- Backend test asserting `facebookUrl` round-trips through the admin and
  public settings endpoints.
- Manual browser verification at every listed breakpoint, plus a direct
  side-by-side screenshot comparison against the reference at desktop width,
  iterated per the visual-accuracy workflow (header height, content width,
  hero height, typography, spacing, radii, shadows, icon sizes) until they
  match.

## Files created

- `frontend/src/components/home/HomeHero.jsx` (+ test)
- `frontend/src/components/home/HeroTrustCard.jsx` (+ test)
- `frontend/src/components/home/SocialMediaStrip.jsx` (+ test)
- `frontend/src/components/home/HomeSectionCard.jsx` (+ test)
- `frontend/src/components/home/ProductCarousel.jsx` (+ test)
- `frontend/src/components/home/HomepageProductCard.jsx` (+ test)
- `frontend/src/components/home/CompactProductRow.jsx` (+ test)
- `frontend/src/components/home/TrendingRightNowSection.jsx` (+ test)
- `frontend/src/components/home/BestSellersSection.jsx` (+ test)
- `frontend/src/components/home/CategoryGridSection.jsx` (+ test)
- `frontend/src/components/home/HomeCategoryCard.jsx` (+ test)
- `frontend/src/components/home/BrowseProductsBanner.jsx` (+ test)
- `frontend/src/components/PublicFooter.jsx` (+ test)
- `frontend/src/components/NewsletterForm.jsx` (+ test)
- `frontend/src/config/homeContent.js`
- `frontend/src/utils/socialPlatforms.js` (+ test)
- `frontend/src/pages/AllProductsPage.jsx` (+ test)
- `frontend/src/pages/AboutPage.jsx` (+ test)
- `frontend/src/pages/ContactPage.jsx` (+ test)
- `frontend/src/pages/PrivacyPolicyPage.jsx` (+ test)
- `frontend/src/pages/TermsOfUsePage.jsx` (+ test)
- `frontend/src/pages/AffiliateDisclosurePage.jsx` (+ test)
- `frontend/public/images/home/hero-placeholder.webp`
- `backend/src/main/resources/db/migration/V19__add_settings_facebook_url.sql`

## Files modified

- `frontend/src/App.jsx` — new routes: `/products`, `/about`, `/contact`,
  `/privacy-policy`, `/terms-of-use`, `/affiliate-disclosure`
- `frontend/src/components/Navbar.jsx` (+ test) — dark restyle, real search
  input, dropped Deals, no Saved/Account
- `frontend/src/components/MobileMenu.jsx` (+ test) — focus trap/restore,
  updated nav list
- `frontend/src/pages/HomePage.jsx` (+ test) — rebuilt to the reference's
  8-section order
- `frontend/src/components/CatalogPage.jsx` (+ test) — `Footer` →
  `PublicFooter`
- `frontend/src/pages/BuyingGuidesPage.jsx` (+ test) — `Footer` →
  `PublicFooter`
- `frontend/src/pages/ComparePage.jsx` (+ test) — `Footer` → `PublicFooter`
- `frontend/src/pages/ComparisonDetailPage.jsx` (+ test) — `Footer` →
  `PublicFooter`
- `frontend/src/pages/ComparisonsPage.jsx` (+ test) — `Footer` →
  `PublicFooter`
- `frontend/src/pages/PublishedBuyingGuidePage.jsx` (+ test) — `Footer` →
  `PublicFooter`
- `frontend/tailwind.config.js` — new `navy` color tokens
- `frontend/src/components/SocialLinks.jsx` (+ test) — reads from the new
  shared `socialPlatforms.js` list instead of its own local array
- `backend/src/main/java/com/twogofindz/backend/entity/SystemSettings.java`
- `backend/src/main/java/com/twogofindz/backend/dto/response/SettingsResponse.java`
- `backend/src/main/java/com/twogofindz/backend/dto/request/SettingsRequest.java`
- `backend/src/main/java/com/twogofindz/backend/mapper/SettingsMapper.java`
- `frontend/src/pages/admin/SettingsPage.jsx` (+ test) — adds a Facebook URL
  field alongside the existing 4 social URL fields

## Files deleted

- `frontend/src/components/HeroSection.jsx` and `HeroSection.test.jsx`
- `frontend/src/components/Footer.jsx` and its test

## Explicitly out of scope for this pass

1. Public account/auth system (signup, login, sessions, profile)
2. Saved/wishlist feature
3. A real newsletter subscription backend
4. A "Deals" concept (route or backend flag)
5. A site-wide review-aggregation page ("Reviews")
6. A "Gift Ideas" concept
7. A real `featured` product flag (newest-first stays as the stand-in)
