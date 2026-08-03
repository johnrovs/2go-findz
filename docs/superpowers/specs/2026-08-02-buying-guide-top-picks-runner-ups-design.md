# Buying Guide — Top Picks & Runner-Ups Step (Step 5) Design

## Goal

Combine the buying guide editor's Top Pick and Runner-Ups into a single
Step 5 ("Top Picks & Runner-Ups"), reducing the workflow from nine steps to
eight. Neither Top Pick nor Runner-Ups has ever had editor UI built before
this task — this is not a refactor of two existing screens into one, it is
the first UI for both, built combined from the start. Steps 1–4 (Basic
Info, Products, Quick Picks, Comparison) are already built and must be
preserved exactly as-is.

## Backend reality (confirms scope)

`BuyingGuideRecommendationSection` / `BuyingGuideRecommendationItem` already
exist and are fully wired through `BuyingGuideRequest`/`BuyingGuideResponse`
— the same "backend ready, frontend missing" situation Quick Picks and
Comparison were each in before their turn.

- Shape: `{ productId, recommendationType: "TOP_PICK" | "RUNNER_UP",
  sectionLabel, whyRecommended, pros: [{content}], cons: [{content}],
  bestFor: [{content}] }`. `sectionLabel` is the recommendation badge text
  (plain string, max 100 chars, `@NotBlank`) — there is no separate
  badge-color/style field in the model.
- `pros`/`cons`/`bestFor` each require **at least one item**, server-side
  (`@NotEmpty`), max 300 chars per item.
- `BuyingGuideServiceImpl.validateRequest()` already enforces: every
  recommendation's `productId` must be in the guide's
  `recommendedProductIds`, and at most one `TOP_PICK` — the latter is
  additionally backstopped at the DB level by a generated-column unique
  constraint (`uq_bg_recommendation_sections_top_pick`). It does **not**
  yet stop the same product being used twice across recommendation
  sections (e.g. as both Top Pick and a Runner-Up, or as two separate
  Runner-Ups) — Task 1 of the plan adds that check, mirroring the Quick
  Picks badge-name and Comparison spec-name duplicate-prevention
  precedent.

## Two parts of the reference spec that don't apply to this app

- **Route redirects.** This app has never had separate `/top-pick` or
  `/runner-ups` routes — the whole multi-step wizard lives under one route
  (`/admin/buying-guides/:id`) with client-side `activeStep` state. There
  is nothing to redirect.
- **Data migration.** Since neither Top Pick nor Runner-Ups has ever had
  editor UI, there is no prior real recommendation data to migrate — only
  an unused backend model. This is a new-build, not a migration.

## Scope-narrowing, matching established precedent from Quick Picks/Comparison

- `Product` has no "Prime" or "availability/in-stock" field (the same gap
  found and scoped around for Quick Picks). Product cards throughout this
  feature omit those. `Product.active` **is** available and drives an
  "archived product" warning wherever a recommendation references an
  inactive product.
- `ConfirmDialog.jsx` and `Modal.jsx` already exist and are directly
  reusable — no new `ReplaceRecommendationDialog`/`RemoveRecommendationDialog`
  components are needed, just two call sites of the existing generic
  confirm dialog.
- Fields are always-editable inputs, no click-to-edit toggle — matches the
  Quick Picks Badge Name / Comparison spec-value convention already
  established in this codebase.
- `IntroductionEditor.jsx` (Basic Info's rich-text field) is hardcoded to
  the "Introduction" label and includes Image/Video/Embed buttons not
  wanted here, and Basic Info must not be touched. A new, purpose-built
  `RecommendationContentEditor.jsx` is built instead (same TipTap
  foundation, a simpler toolbar, and adds undo/redo which the original
  lacks).

## 1. Stepper and navigation

`Stepper.jsx`'s `STEPS` becomes:

```
Basic Info, Products, Quick Picks, Comparison, Top Picks & Runner-Ups,
Buying Guide, FAQs, SEO & Publish
```

`MAX_BUILT_STEP` becomes `5`. Steps 6–8 remain disabled placeholders (never
built), exactly as steps 5–9 were before this task.

`BuyingGuideForm.jsx` renders the combined editor for `activeStep === 5`.
Previous returns to Comparison (step 4) without discarding in-progress
edits. Next validates, saves, and unlocks step 6 — since step 6 has no
render block yet, Next does not force-navigate there; it saves and returns
to the guide list, exactly matching the established "last built step"
terminal pattern from Comparison's own Next button.

Published Table of Contents entries for `TOP_PICK` and `RUNNER_UPS` stay
two separate, independently toggleable/reorderable entries (already true
in `TocBuilder.jsx` and `DEFAULT_TOC_ENTRIES`) — only the *editor*
combines them into one step.

## 2. Top Pick section

White card, heading "Top Pick — Our #1 Recommendation", supporting text
"Select the product that is your top pick and add your expert reasons,
pros, cons, and who it's best for."

**Empty state** (no Top Pick yet): trophy/award icon, "No Top Pick
selected", "Choose the strongest overall product from this guide.", and an
**Add Top Pick Product** button. No empty editing form is shown before a
product is selected.

**Selected state**: a product summary card (image, name, brand, price,
rating, review count, an inline "This product is no longer active" warning
when `product.active === false`) plus **Change Product** and **Remove
Product** actions, followed by a required **Recommendation Badge** field
(shown in Live Preview as the badge over the product, e.g. "Best Overall"
— this is the same `sectionLabel` the backend already requires non-blank
for every recommendation section, Top Pick included; defaulting it to a
hidden fixed value instead of exposing it would mean the admin can't see
or control something the published guide actually shows), then the shared
editorial editor (Section 5).

**Add/Change Top Pick Product** opens `RecommendationProductPicker`
(modeled directly on the existing `AddQuickPickDialog.jsx`), listing guide
products that are not already the Top Pick and not already a Runner-Up.
Selecting a replacement when a Top Pick already exists first shows the
existing `ConfirmDialog`: "Replacing your Top Pick will discard its
written content unless you keep the current product as a Runner-Up
first. Continue?" — content is never silently reassigned to a different
product's ID.

## 3. Runner-Ups section

White card, heading "Runner-Ups — Strong Alternative Choices", supporting
text "Add alternative products for readers with different budgets,
priorities, or use cases." Header shows the current count and the
configured maximum (4 — no configuration exists in the data model, so the
spec's own documented fallback rule applies).

**Empty state**: "No Runner-Ups added", "Add alternative recommendations
for readers who need a different price, feature, or use case.", **Add
Runner-Up Product** button.

**Add Runner-Up Product** opens the same `RecommendationProductPicker`,
listing guide products that are not the current Top Pick and not already a
Runner-Up. The Add button (and the section's own Add button) disables at 4
Runner-Ups with inline text explaining why.

Each Runner-Up renders as an expandable `RunnerUpEditorCard`:
- Collapsed header: drag handle, position number, recommendation badge,
  product thumbnail/name/brand/price/rating, expand/collapse toggle,
  Change Product, Remove Runner-Up.
- Expanded body: **Recommendation Badge** required text field (this *is*
  `sectionLabel` — max 100 chars, no separate color/style field, matching
  the Quick Picks badge precedent of a plain string with deterministic
  position-based color only, never a saved color choice), then the shared
  editorial editor (Section 5).

Reordering uses drag-and-drop plus keyboard Move Up/Down, the same
`@dnd-kit` pattern as every other reorderable list in this app. The Top
Pick is never part of this orderable list and cannot be dragged into it.

## 4. Change/Remove confirmations

Both use the existing `ConfirmDialog.jsx` directly:

- **Change Product** (Top Pick or Runner-Up): explains the written content
  will not carry over to the new product; Cancel / Replace Product.
- **Remove** (Top Pick or Runner-Up): explains only the recommendation
  record is removed — the product stays in Products, Quick Picks, and
  Comparison untouched; Cancel / Remove. If the save fails, the removed
  card is restored in the editor (optimistic-with-rollback, same pattern
  already used for Quick Picks/Comparison list mutations).

## 5. Shared editorial editor

Used identically for the Top Pick and every Runner-Up:

- **Why We Recommend It** (required): new `RecommendationContentEditor.jsx`
  — TipTap with Bold/Italic/Underline/Bullet+Numbered lists/Align
  left-center-right/Link/Undo/Redo, plus a live word counter. Client-side
  validation requires 10–150 words (the backend only requires non-blank
  text); output is sanitized the same way Basic Info's Introduction
  already is (`HtmlSanitizer.sanitize` server-side).
- **Pros** / **Cons** / **Best For**: one reusable
  `RecommendationListEditor.jsx` (drag + keyboard reorder, add/edit/delete,
  blank/duplicate prevention, stable client-generated IDs), parametrized by
  label — "Pro" for the Add button under Pros (not "Pros", per spec),
  "Con" under Cons, "Item" under Best For. Six live instances total per
  guide (3 lists × Top Pick, 3 × each Runner-Up).

## 6. Live Preview

Extends `LivePreview.jsx` with two new sections, "OUR TOP PICK" and
"RUNNER-UPS", using real saved product and editorial data only — never a
hardcoded example product.

**Dynamic section numbering (retrofit).** Quick Recommendations and
Comparison Table currently render hardcoded "1."/"2." literals. This task
replaces that with a shared computed numbering: build an ordered list of
which of the four numbered sections (`QUICK_RECOMMENDATIONS`,
`COMPARISON_TABLE`, `TOP_PICK`, `RUNNER_UPS`) are both visible in
`tocEntries` and have actual content to render, in `tocEntries` order, and
number them 1..N from that list. A section with no content (e.g. no Top
Pick selected yet) is skipped entirely rather than reserving a number —
consistent with the existing "omit section if empty" convention already
used for Quick Picks/Comparison.

**Top Pick preview**: badge, product image, clickable product name,
rating, review count, price, "View on Amazon" (safe attributes:
`rel="nofollow sponsored noopener noreferrer"`, same `isSupportedAmazonUrl`
guard already used for Quick Picks/Comparison), Why We Recommend It, Pros
(green check icons), Cons (red cross icons), Best For (plain list). Renders
nothing if no Top Pick is selected yet.

**Runner-Ups preview**: for each Runner-Up in saved order — rank, badge,
product thumbnail, name, rating/review count, price, View on Amazon, Why
We Recommend It, Pros, Cons, Best For — in a compact, individually
expandable card suited to the sidebar's width. Renders nothing if there are
no Runner-Ups yet.

Preview panel stays sticky on desktop; on narrow viewports it already moves
into the existing "Preview" modal, same as every other step.

## 7. Validation (Next)

Blocks advancing unless, mirroring the Quick Picks/Comparison validation
pattern:
- A Top Pick is selected, and its product is still in the guide's
  `recommendedProducts`.
- The Top Pick and every Runner-Up has a non-blank recommendation badge.
- Why We Recommend It is present and within the 10–150 word bound, for the
  Top Pick and every Runner-Up.
- Every recommendation (Top Pick and each Runner-Up) has at least one
  non-blank, non-duplicate Pro, Con, and Best For entry.
- Every Runner-Up references a unique product; no Runner-Up matches the
  Top Pick's product.

On failure: stay on the combined step, show an inline error summary, expand
the first invalid Runner-Up card, and move focus to the first invalid
field. On success: save (existing `submit(false)` pattern) and unlock step
6.

## 8. Files

**New:**
- `frontend/src/components/buying-guide-form/TopPicksAndRunnerUpsStep.jsx`
- `frontend/src/components/buying-guide-form/TopPickSection.jsx`
- `frontend/src/components/buying-guide-form/RunnerUpsSection.jsx`
- `frontend/src/components/buying-guide-form/RunnerUpEditorCard.jsx`
- `frontend/src/components/buying-guide-form/RecommendationProductPicker.jsx`
- `frontend/src/components/buying-guide-form/RecommendationContentEditor.jsx`
- `frontend/src/components/buying-guide-form/RecommendationListEditor.jsx`
- `frontend/src/components/buying-guide-form/RecommendationBadgeField.jsx`
- Matching `.test.jsx` for each.

**Modified:**
- `frontend/src/components/BuyingGuideForm.jsx` (+ test)
- `frontend/src/components/buying-guide-form/LivePreview.jsx` (+ test) —
  new sections and the dynamic-numbering retrofit.
- `frontend/src/components/buying-guide-form/Stepper.jsx` (+ test)

**Backend:**
- `backend/.../service/impl/BuyingGuideServiceImpl.java` — duplicate
  product-across-recommendation-sections validation.
- Matching controller test addition.
- No entity, migration, or DTO changes — everything else already exists.

## Explicitly out of scope for this task

- Route redirects (no such routes exist in this app).
- A real data migration (nothing existed to migrate).
- Badge color/style persistence (no such field in the model).
- Prime/availability product fields (no such fields in the model).
- Buying Guide, FAQs, and SEO & Publish steps or pages.
