# Buying Guide Desktop Preview — Real Page Layout — Design Spec

## Goal

The wide modal added by the previous feature (`docs/superpowers/plans/2026-08-17-buying-guide-preview-desktop-modal.md` — clicking "Desktop" in the sidebar live preview opens a `size="xl"` modal) currently just shows the same compact card-style `LivePreview` component wider, with a working internal Mobile/Desktop toggle. This change replaces that modal's content with a genuine reproduction of the real published buying guide page's layout (`PublishedBuyingGuidePage.jsx`'s actual section components), driven by the same live, in-progress, unsaved form data — and drops the now-inapplicable internal toggle.

## Conflicts / decisions resolved with the user before implementation

- **Navbar/Footer**: excluded. Both `Navbar` and `BuyingGuideBreadcrumbs` contain real `react-router-dom` `Link`s to `/` and `/buying-guides` — clicking them inside the modal would navigate the whole SPA away from the form, discarding the unsaved draft (nothing autosaves). The modal shows only the guide content itself. The breadcrumb line is kept as plain inert text (`Home / Buying Guides / {title}`, matching `LivePreview`'s existing non-interactive breadcrumb), not the real `BuyingGuideBreadcrumbs` component.
- **Mobile toggle**: dropped for this view. The real section components use Tailwind's viewport-based responsive classes (`lg:`, `xl:`); this project has no container-query plugin installed (`tailwindcss": "^3.4.0"`, `plugins: []` in `tailwind.config.js`), so narrowing a wrapper div — the mechanism that worked for `LivePreview`'s own zero-breakpoint markup — cannot correctly reflow these real components into a mobile layout. This modal now always shows the real desktop-style layout; there is no toggle inside it.
- **Scope boundary preserved from the prior feature**: this only changes what's rendered inside the sidebar-triggered `isDesktopPreviewOpen` modal. The header's separate "Preview" button and its `isPreviewOpen` modal keep showing the compact `LivePreview` card exactly as today, untouched. `LivePreview.jsx` itself is not modified by this change.

## Consequence: `FinalRecommendationSection` is newly included

`LivePreview.jsx` explicitly hides the Final Recommendation section (`hasFinalRecommendation: false`, hardcoded in its `computeGuideSectionNumbers` call). The real published page always shows it when a Top Pick exists (`hasFinalRecommendation: Boolean(guide.topPick)`). Since the explicit goal is matching the real page, the new component includes it too. This is a deliberate, intentional divergence from the sidebar/header preview's behavior, not an oversight.

## Verified component contracts (read directly from source before writing this spec)

Every real section component below accepts a prop shape that `LivePreview.jsx` already knows how to build (verbatim reuse) or a trivially-derived variant of it. None of them require a fetched, saved "guide" API object — they're all fed plain, already-shaped data.

| Component | Props needed | Data source |
|---|---|---|
| `BuyingGuideHero` | `title, excerpt, coverImageFilename, updatedAt, affiliateDisclosure` | Direct from `previewProps` + `settings?.affiliateDisclosure`. `updatedAt` is safe to omit/pass `null` — `formatUpdatedDate` returns `null` and the component just skips the "Updated on" clause. |
| `GuideTableOfContents` | `items: [{id, number, label, anchorId}], activeId, onNavigate` | Built the same way `PublishedBuyingGuidePage.jsx` builds `tocItems`, reusing this codebase's existing `computeGuideSectionNumbers` util (already imported by `LivePreview.jsx`) and `STRUCTURAL_LABELS` (already imported by `LivePreview.jsx` from `TocBuilder.jsx`) for structural entry labels. `onNavigate` just calls `scrollIntoView` on the target anchor within the modal's own scrollable area — the component already does `event.preventDefault()` itself and never performs real navigation, so this is safe to wire up directly (no tracking). `activeId` is always `null` — the real page's scroll-spy `IntersectionObserver` highlighting is a nice-to-have polish behavior for long-form reading, not essential for a preview; entries stay clickable and functional, they just never show the "currently viewing" highlight. This keeps the component free of `useEffect`/observer wiring. |
| `QuickRecommendationsSection` | `quickRecommendations: [{product, badgeName}], number, guideId, onAffiliateClick` | `quickRecommendations` passed straight through from `previewProps`, unchanged. `guideId={null}`, `onAffiliateClick={() => {}}`. |
| `ProductComparisonSection` | `comparisonTable: {specificationNames, rows} | null, number, guideId, onProductClick` | Same object `LivePreview.jsx` already builds inline from `comparisonSpecs`/`comparisonProducts` — `null` when either is empty (the component checks `!comparisonTable || comparisonTable.rows.length === 0`). `guideId={null}`, `onProductClick={() => {}}`. |
| `TopPickSection` / `RunnerUpsSection` / `FinalRecommendationSection` | `recommendation`-shaped object: `{product, sectionLabel, whyRecommended, pros, cons, bestFor}` | `LivePreview.jsx`'s existing `toRecommendationCardShape(section)` helper produces exactly this shape already — reused verbatim. `guideId={null}`, `onAffiliateClick={() => {}}` on each. |
| `BuyingGuideContentSection` | `sections: [{title, content, anchorId}], number, guideId, onExpand` | Same `customSectionsWithAnchors` computation `LivePreview.jsx` already does, reshaped to `{title, content, anchorId}` per entry. `guideId={null}`, `onExpand={() => {}}`. |
| `BuyingGuideFaqSection` | `faqs: [{question, answer}], number, guideId, onExpand` | Same `faqs.map(...)` `LivePreview.jsx` already does. `onExpand` is optional (`onExpand?.(question)` in `BuyingGuideFaqAccordion`) — can be omitted entirely. |

All of these components call `useTranslation('guides')` (via `react-i18next`, lazy-loaded through `resourcesToBackend` — confirmed in `frontend/src/i18n/index.js`, no fixed namespace allowlist) and are already wrapped by a top-level `<React.Suspense fallback={null}>` in `main.jsx`, so no special Suspense handling is needed here — this is identical infrastructure to what the real public page already relies on.

## New component: `DesktopGuidePreview.jsx`

**File**: `frontend/src/components/buying-guide-form/DesktopGuidePreview.jsx` (sits alongside `LivePreview.jsx`, same directory convention).

**Props**: identical shape to `LivePreview` — `title, excerpt, coverImageFilename, tocEntries, settings, quickRecommendations, comparisonSpecs, comparisonProducts, recommendationSections, faqs` (all with the same defaults `LivePreview` uses). Consumed as `<DesktopGuidePreview {...previewProps} />`, exactly like `LivePreview` is today.

**Structure** (mirrors `PublishedBuyingGuidePage.jsx`'s `<main>` content exactly, minus `Navbar`/`PublicFooter`/the real breadcrumbs/the outer `max-w-7xl` wrapper, since the modal's own `size="xl"` frame already constrains width):

```jsx
<div>
  <p className="mb-4 text-xs text-muted">Home / Buying Guides / {title || 'Untitled Guide'}</p>

  <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
    <BuyingGuideHero .../>
    <GuideTableOfContents .../>
  </div>

  <div className="mt-6 space-y-10">
    <div id="quick-recommendations">
      <QuickRecommendationsSection .../>
    </div>
    <div id="product-comparison">
      <ProductComparisonSection .../>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <div id="top-pick">
        <TopPickSection .../>
      </div>
      <div id="runner-ups">
        <RunnerUpsSection .../>
      </div>
    </div>
    <div id="buying-guide">
      <BuyingGuideContentSection .../>
    </div>
    <div id="faq">
      <BuyingGuideFaqSection .../>
    </div>
    <div id="final-recommendation">
      <FinalRecommendationSection .../>
    </div>
  </div>
</div>
```

Each wrapping `id` matches the `anchorId` the TOC-building logic assigns to that structural section (mirroring `PublishedBuyingGuidePage.jsx`'s own `tocItems` construction exactly: `quick-recommendations`, `product-comparison`, `top-pick`, `runner-ups`, `buying-guide` — a single entry regardless of how many custom sections exist inside it, `faq`, `final-recommendation`) — without these, `GuideTableOfContents`' `onNavigate`/anchor-scroll would have nothing to scroll to.

## Integration: `BuyingGuideForm.jsx`

One line changes — the `isDesktopPreviewOpen` modal's child swaps from `LivePreview` to the new component:

```diff
  <Modal isOpen={isDesktopPreviewOpen} onClose={() => setIsDesktopPreviewOpen(false)} title="Preview" size="xl">
-   <LivePreview {...previewProps} />
+   <DesktopGuidePreview {...previewProps} />
  </Modal>
```

Nothing else in `BuyingGuideForm.jsx` changes. The sidebar's `LivePreview` instance (with its `onRequestDesktopModal` prop, added by the prior feature) is untouched — it still opens this same modal, which now just shows different content inside it.

## Test fallout from the prior feature (expected, not a regression)

`BuyingGuideForm.test.jsx`'s existing test `'opens a wide modal with a working toggle when Desktop is clicked in the sidebar preview'` asserts the dialog contains a `.rounded-card`-classed element and working "Preview on mobile"/"Preview on desktop" buttons *inside the dialog* — both of those no longer exist once the dialog renders `DesktopGuidePreview` instead of `LivePreview`. This test must be rewritten (not just extended) to assert the new dialog's actual content instead — the real page's `<h1>` title (from `BuyingGuideHero`), the `max-w-5xl` class on the dialog, and the *absence* of any "Preview on mobile"/"Preview on desktop" buttons within `within(dialog)` (proving the toggle was correctly dropped from this view, while the sidebar's own toggle buttons — outside the dialog — still exist and work as before).

## Testing plan

**New `DesktopGuidePreview.test.jsx`**: mirror `LivePreview.test.jsx`'s coverage style but for the real components — render with a title/excerpt and assert `BuyingGuideHero`'s `<h1>` renders it; render with `quickRecommendations` and assert the section appears; render with a `recommendationSections` entry containing `recommendationType: 'TOP_PICK'` and assert both the Top Pick section *and* the Final Recommendation section render (proving the intentional divergence from `LivePreview` — this is the one behavior this spec changes on purpose, so it needs its own explicit test); render with no data at all and assert no crash and the breadcrumb still shows "Untitled Guide" as a fallback (matching `LivePreview`'s existing fallback pattern).

**`BuyingGuideForm.test.jsx`**: rewrite the existing sidebar-desktop-modal test per the "Test fallout" section above.

## Final manual verification

1. Open a buying guide form with a title, quick recommendations, a comparison table, a top pick, runner-ups, custom content sections, and FAQs filled in — the fullest realistic draft.
2. Click the sidebar preview's Desktop icon.
3. Confirm the modal shows something that looks like the actual public buying guide page: a real hero with badge/title/excerpt/image, a sticky table of contents beside it, properly styled sections below (not compact cards), and a Final Recommendation banner at the bottom.
4. Confirm there is no Mobile/Desktop toggle inside this modal.
5. Click a table-of-contents entry inside the modal — confirm it scrolls the modal's own content to that section (not the underlying page, and not a real navigation).
6. Confirm the modal has no Navbar and no Footer, and nothing inside it is clickable in a way that would navigate away from the form.
7. Close the modal — confirm the underlying form and its sidebar preview are completely unaffected.
8. Click the form header's separate "Preview" button — confirm it still opens its own, unrelated, unchanged compact-card modal.
