# Comparisons — Stage 4: SEO + UX/Performance Polish

## Context

This is Stage 4 — the final stage — of the 4-stage Comparisons feature.
Backend (Stage 1), admin authoring UI (Stage 2), and public page
rendering (Stage 3) are all complete and merged to master. Stage 3's
design doc (`docs/superpowers/specs/2026-07-27-comparisons-public-page-design.md`)
explicitly deferred SEO and UX/performance polish to this stage.

## A Constraint That Shapes This Stage's Scope

This app is a client-side-rendered Vite/React SPA with **no server-side
rendering or pre-rendering**, and had **zero existing SEO/head-management
tooling anywhere** before this stage — no `react-helmet-async`, no
dynamic `<title>`/meta tags on any page, a static `index.html` with one
hardcoded title.

This matters because client-JS-injected `<title>`/meta description/
JSON-LD can plausibly help crawlers that execute JavaScript (Google's
indexer largely does), but **Open Graph tags cannot** — social-preview
bots (Facebook, Twitter/X, LinkedIn, Slack, etc.) do not execute
JavaScript, so OG tags injected after page load never reach them. Per
explicit decision: **this stage builds title/description/canonical/
JSON-LD, and deliberately skips Open Graph tags** rather than shipping
something that looks like it works but silently produces broken link
previews on every social platform. OG support would need server-side
rendering to actually function — out of scope here, revisit if/when the
site adds SSR.

## SEO Architecture

`frontend/src/hooks/useDocumentHead.js` — a small custom hook, not a new
dependency. Pulling in `react-helmet-async` (with its `HelmetProvider`
wrapping, context plumbing, etc.) for exactly two pages is more machinery
than this need justifies; a focused hook matches this codebase's existing
pattern of small hooks (`useCompare`, `useAuth`, `useToast`).

```
useDocumentHead({ title, description, canonicalUrl, jsonLd })
```

- Sets `document.title`
- Creates or updates a `<meta name="description">` tag
- Creates or updates a `<link rel="canonical">` tag
- Injects a `<script type="application/ld+json">` block when `jsonLd` is
  provided (accepts an array, since a page may need more than one schema
  block — e.g. Breadcrumb + FAQ together)
- Cleans up on unmount: resets `document.title` to the app default and
  removes every tag it injected, so navigating between pages never leaks
  stale metadata onto the next one

## SEO Content

**`ComparisonDetailPage`**: uses the comparison's `seoTitle`/
`seoDescription` if the admin set them in Stage 2's authoring form,
falling back to `title`/`description` when blank. Canonical URL is built
from `window.location.origin` + the current path — no new environment
variable needed, and it always reflects whatever domain the app is
actually deployed at (works identically in local dev and production).

JSON-LD:
- **`BreadcrumbList`** (`schema.org/BreadcrumbList`), always: Home →
  Comparisons → `{title}`.
- **`FAQPage`** (`schema.org/FAQPage`), only when `faqs.length > 0`,
  built from the comparison's FAQ entries.

The source requirements doc also mentioned a "comparison schema when
appropriate." There is no real `schema.org` type for a product-comparison
page — rather than inventing a non-standard one, this stage implements
only the two schema types with genuine, well-defined value:
`BreadcrumbList` and `FAQPage`.

**`ComparisonsPage`** (list): static title/description via the same hook
("Comparisons | 2Go Findz" / a fixed description) — no JSON-LD, no
per-item canonical (it's a list, not a single entity).

## UX Polish

**Sticky section navigation**: a slim sticky sub-nav rendered below the
main `Navbar` on the detail page, with jump links to the *fixed* regions
only — Comparison Table, Product Breakdown, FAQ. Dynamic
`ComparisonSection` entries (admin-authored, arbitrary count and
headings) are excluded from this nav; including them would make it
unbounded and cluttered. The nav itself is omitted if none of its three
target regions are present (e.g. no spec rows and no FAQ on a very simple
comparison).

**Print-friendly styling**: `print:hidden` applied to `Navbar`, the new
sticky section nav, and every Amazon CTA button (a printed page shouldn't
carry "click here" buttons). The comparison table's `overflow-x-auto`
wrapper gets a print-specific override so the table isn't clipped on
paper — it should print at whatever width it needs, even across the
printable area.

**Mobile section collapse**: scoped specifically to the FAQ region
becoming a real accordion — each question collapsed by default, click to
expand its answer. This is the one region on the page where collapse is a
well-established, obviously-beneficial pattern; the design deliberately
does not attempt to generically collapse all 7 regions, since the benefit
elsewhere is unclear and the added complexity isn't justified.

## Performance

- `loading="lazy"` added to Product Breakdown card images (Stage 3
  already added this to the list-page cards and Related-Comparisons
  cards, but missed the Product Breakdown region).
- The spec table's `groupSpecRows()` computation wrapped in `useMemo`,
  keyed on `comparison.specRows`. This is newly relevant now that FAQ
  accordion state lives on the same page component — without
  memoization, toggling a single FAQ entry would re-run the grouping
  logic on every keystroke-equivalent interaction even though the spec
  rows haven't changed.

## Testing

Vitest + React Testing Library, following established conventions:

- `useDocumentHead.test.js` — sets title/description/canonical/JSON-LD on
  mount, updates them when props change, cleans up on unmount
- `ComparisonDetailPage.test.jsx` (extended) — new assertions for:
  document title reflecting `seoTitle`/`title` fallback, JSON-LD script
  content (Breadcrumb always, FAQPage only when FAQs exist), sticky
  section nav links present/omitted based on content, FAQ accordion
  collapse/expand behavior (answer hidden until its question is clicked)
- `ComparisonsPage.test.jsx` (extended) — asserts the static list-page
  title is set

## Out of Scope for Stage 4

- Open Graph tags (see constraint section above — requires SSR to
  function correctly, revisit later)
- Any change to the existing ad-hoc `/compare` page
- Dark mode (out of scope entirely, all 4 stages of this feature)
- Retrofitting `useDocumentHead` onto other existing pages (Buying
  Guides, product pages, etc.) — this stage scopes the hook's usage to
  Comparisons only, even though the hook itself is written generically
  enough to be reused later if the team decides to
