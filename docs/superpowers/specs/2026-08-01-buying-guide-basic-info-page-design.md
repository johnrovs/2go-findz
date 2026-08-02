# Buying Guide Editor — Basic Info Step (Stage 2, Part 1)

## Context

This is the third and final sequenced sub-project for the Buying Guide editor
work: backend unified TOC model (done) → admin navy/purple design system
(done) → **this: the Basic Info step of the multi-step editor page**.

The reference mockups show a full 9-step wizard (Basic Info, Products, Quick
Picks, Comparison, Top Pick, Runner-Ups, Buying Guide, FAQs, SEO & Publish).
Per the user's explicit scope from the original request: **only Step 1
(Basic Info) is built now.** Steps 2–9 render in the stepper (matching the
reference visually) but are not clickable — their content doesn't exist yet
and building placeholder pages for them is out of scope. Each will get its
own design/plan cycle in a future session, seeded with its own reference
image.

`frontend/src/components/BuyingGuideForm.jsx` today is a flat, single-page
form on the *old* backend schema (`{title, excerpt, content,
coverImageFilename, active, recommendedProductIds}`) — six of the ~16 fields
the current backend actually accepts. This is a full rewrite, not an
incremental patch.

## Architectural Template: `ComparisonForm.jsx`

`ComparisonForm.jsx` + `comparison-form/*.jsx` is the closest existing
precedent and is followed directly rather than inventing new conventions:

- **One component holds the entire guide's state** (all ~16 backend fields,
  even the ones later steps will populate) as a set of `useState` hooks —
  not a form library. Matches every existing admin form in this codebase.
- **Tabs switch which section is *visible*, not which state exists** — all
  state is always live in memory, so switching tabs never loses data (this
  is literally how `ComparisonForm` already avoids a "lost my Products tab
  edits when I clicked Basic Info" bug class).
- **One `handleSubmit` builds the complete payload from all state and calls
  `onSubmit` once** — no partial-section saves, matching the backend's
  whole-guide replace-on-save design. For a **new** guide this means Save
  as Draft on Basic Info *alone* sends a fully valid `BuyingGuideRequest`
  with empty lists for `quickRecommendations`/`comparisonSpecs`/
  `recommendationSections`/`faqs`/`recommendedProductIds` — the backend
  accepts this today (only `@NotNull`, not `@NotEmpty`, on those lists) —
  and it's the same shape later steps will simply populate more of.
  **For an existing guide being edited, those five collections must be
  round-tripped, not zeroed**: `BuyingGuideForm` initializes them from the
  loaded `guide` response (mapped into request shape — e.g.
  `quickRecommendations: guide.quickRecommendations.map(r => ({productId:
  r.product.id, badgeName: r.badgeName}))`, `recommendedProductIds:
  guide.recommendedProducts.map(p => p.id)`, and equivalently for
  `comparisonSpecs` (nested `values`), `recommendationSections` (nested
  `pros`/`cons`/`bestFor`), and `faqs`) and submits that unchanged state
  back on every save. There is no UI on this page to edit those
  collections yet, so whatever was loaded is exactly what should be saved
  — the whole-entity replace-on-save pattern means naively defaulting them
  to `[]` would silently delete any quick recommendations, comparison
  rows, recommendation sections, or FAQs a future Step 2–9 session (or a
  direct API call) had already added, the moment someone touches Basic
  Info and clicks Save.
- **`BuyingGuideFormPage.jsx` stays a thin data/submit wrapper** (load by id,
  call create/update, toast, navigate) — it gains the `getCategories()`
  fetch `ComparisonFormPage.jsx` already has (currently missing here, the
  one structural gap blocking a `categoryId` field from working at all).

## New Dependencies

- **`@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-link` +
  `@tiptap/extension-image`** — the Introduction field's rich-text editor.
  TipTap is headless (no bundled toolbar UI to fight), so the custom
  toolbar in the reference (Paragraph style, B/I/U, lists, alignment, link,
  image) is built as ordinary buttons calling TipTap's `editor.chain()`
  commands — same interaction pattern as every other custom control already
  in this codebase.
- **`@dnd-kit/core` + `@dnd-kit/sortable`** — the TOC builder's drag-and-drop
  reordering. Every other reorderable list in this codebase (`EntityPicker`,
  `FaqTab`, etc.) uses up/down arrow buttons instead; this is the first real
  DnD in the app, added because the TOC spec explicitly asks for drag
  handles and the reference shows them. Keyboard reordering (`@dnd-kit`
  ships built-in keyboard sensor support) satisfies the accessibility
  requirement without a second implementation.
- Both are new `package.json` dependencies — nothing else (no form library,
  no date picker, no state-management library) per the codebase's existing
  "hand-roll with `useState`" convention.

## Component Tree

```
BuyingGuideFormPage.jsx (thin wrapper, unchanged pattern — gains categories fetch)
└── BuyingGuideForm.jsx (rewritten — owns all state, all 9-tab shell)
    ├── buying-guide-form/EditorHeader.jsx      (sticky: title, status badge, description, actions)
    ├── buying-guide-form/Stepper.jsx           (9 steps; only step 1 clickable)
    ├── buying-guide-form/BasicInfoStep.jsx     (the actual Step 1 fields)
    │   ├── ImageUploader.jsx                   (existing, reused — see below)
    │   ├── buying-guide-form/IntroductionEditor.jsx  (TipTap wrapper)
    │   └── buying-guide-form/TocBuilder.jsx    (dnd-kit list, inline add/edit)
    └── buying-guide-form/LivePreview.jsx       (sticky right panel, desktop/mobile toggle)
```

`ConfirmDialog.jsx` (existing, already reused by `ComparisonsPage.jsx`,
`ProductsPage.jsx`, `CategoriesPage.jsx`, `BuyingGuidesPage.jsx`) covers the
confirm-before-publish modal directly — its
`{isOpen, title, message, confirmLabel, isDestructive, isLoading, onConfirm, onCancel}`
props are a generic fit, so no new `PublishConfirmDialog.jsx` component is
built. The same component is reused a second time for the TOC Builder's
confirm-before-delete-with-content step (see below).

`ImageUploader.jsx` gains one new optional prop, `label` (defaults to its
current hardcoded `"Product Image"` string) so this page can pass `"Featured
Image"` without forking the component — the smallest change that avoids
duplicating an entire working file for one label string.

## Field-by-Field Behavior

| Field | Backend field | Behavior |
|---|---|---|
| Title | `title` | Required, max 200. Slug auto-derives from it (see below) whenever slug is still in its auto-generated state. |
| Slug | `slug` | Required at submit time (auto-filled if the user never edits it). Editable afterward; once hand-edited, title changes stop overwriting it (same "dirty flag" behavior `resolveSlug` already implies server-side, mirrored client-side so the user doesn't get surprised by a slug that silently changes back). Lowercase/hyphenated live-formatted as typed. Shows the resolved `/buying-guides/<slug>` URL preview beneath it. |
| Excerpt | `excerpt` | Required, max 250 (spec's number — the backend allows up to 500; the *form* enforces the tighter 250 the reference UI shows, since a stricter client-side cap is always safe against a looser server-side one). Live character counter. |
| Category | `categoryId` | Required. `<select>` populated from `getCategories()`, matching `ComparisonForm`'s exact pattern — no hardcoded options. |
| Featured Image | `coverImageFilename` | Optional (backend allows null). `ImageUploader` reused as-is, labeled "Featured Image". |
| Introduction | `introduction` | Required (non-empty after stripping HTML tags — an editor containing only `<p></p>` counts as empty). TipTap, `editor.getHTML()` is the value sent (already sanitized again server-side, so no double-sanitization concern). Live word counter beneath. |
| Status | derived: `active` + `scheduledPublishAt` | Three-option `<select>`: Draft / Scheduled / Published — no direct backend field, purely a UI convenience over the two real ones. **Draft** → `active:false, scheduledPublishAt:null`. **Scheduled** → `active:false, scheduledPublishAt:<picked date>` (reveals the Publish Date field, required, must be future). **Published** → `active:true, scheduledPublishAt:null`. Switching away from "Scheduled" clears any picked date; switching a loaded guide's initial value is derived the same way in reverse (`active:true` → Published; `active:false` with a non-null `scheduledPublishAt` → Scheduled; otherwise → Draft). |
| Publish Date | `scheduledPublishAt` | Only rendered when Status is "Scheduled". `datetime-local` input, required in that state, must be a future value (client-side check mirrors the backend's `@Future` constraint) — reusing the exact pattern `ProductForm.jsx`'s schedule switch already established, including sending a naive local-time string (no `.toISOString()` UTC conversion — the backend's `scheduledPublishAt` is a naive `LocalDateTime`, and `ProductForm`'s own commit history includes a real bug fix for getting this wrong once already). |

`seoTitle`/`seoDescription` are part of the submitted payload (initialized to
`null`) but have **no input on this page** — they belong to the SEO &
Publish step (9), not built yet.

## Table of Contents Builder

Operates directly on `tocEntries` state (array matching the backend's
`TocEntryRequest` shape: `{ sectionKey, title, content, visible }`).

- **Structural rows** (`sectionKey` set — Quick Recommendations, Comparison
  Table, Top Pick, Runner-Ups, FAQs): fixed label (derived client-side from
  the enum value, e.g. `QUICK_RECOMMENDATIONS` → "Quick Recommendations"),
  drag handle, visibility toggle, no title/delete controls (matches the
  backend's rule that a structural entry can't carry a custom title/content
  and is never truly removable, only hidden).
- **Custom rows** (`sectionKey: null`): drag handle, inline-editable title,
  visibility toggle, delete button (with a `ConfirmDialog` confirm step —
  same reused component as Publish — if content is non-empty, per the
  original spec's "confirm before deleting a section with saved content"). **"Add Section" opens an inline title + plain-text
  content field right in this builder** (confirmed with the user) — both
  required before the row is considered valid, since the backend rejects a
  blank-content custom entry. When Step 7 ("Buying Guide Content") is built
  in a future session, it becomes a richer rich-text editing surface for
  this *same* data — no model or shape change needed then, just a better
  editor.
- Reordering: `@dnd-kit` drag, plus visible up/down icon buttons as the
  keyboard-accessible equivalent (not just relying on dnd-kit's keyboard
  sensor being discoverable) — belt-and-suspenders for the explicit
  keyboard-accessibility requirement.
- On load (edit mode), `tocEntries` comes straight from the loaded guide's
  response. On create, it starts as the 5 structural entries in default
  order, all visible — client-side mirror of what the backend would
  backfill anyway, so the builder never starts empty.

## Live Preview Panel

New component, no existing precedent to reuse (checked — no other admin
form in this codebase has a live preview surface). Renders from the *same*
in-memory state `BasicInfoStep` edits — no separate fetch, no debounce
needed since it's just reading React state that's already current.

- Desktop: sticky column, always visible, ~28% width alongside the ~72%
  form column (matching the reference's proportions).
- Mobile: hidden inline; the header's "Preview" button opens the same
  content in a modal/drawer instead (this is what the header button is
  *for* — on desktop the panel is already visible, so the button either
  scrolls to it or is redundant; simplest is to always open the modal on
  click regardless of viewport, so its behavior doesn't depend on a
  breakpoint check).
- Content: breadcrumb (`Home / Buying Guides / <title-or-placeholder>`),
  title, "By 2Go Findz Team · Updated <today's date>" (static author string
  — no author field exists anywhere in this feature), featured image
  (placeholder icon if none uploaded yet), excerpt, a rendered
  table-of-contents list built from visible `tocEntries` (structural rows
  show their derived label, custom rows show their title), and the fixed
  Amazon Associate disclosure sentence from the original spec.

## Stepper

9 steps, numbered circles + labels, horizontally scrollable on narrow
viewports (`overflow-x-auto` on the nav, matching how `AdminSidebar`'s
mobile drawer already handles overflow). Step 1 ("Basic Info") is always
the active step for this page (no step-switching logic needed yet since
nothing else exists to switch to). Steps 2–9 render with a disabled visual
treatment (`cursor-not-allowed`, muted color, `aria-disabled="true"`) and
their `onClick` is a no-op — clicking does nothing, not even a toast,
since "coming soon" messaging for 8 unbuilt steps adds noise without
adding information the disabled visual state doesn't already convey.

## Header Actions

- **Preview**: opens the `LivePreview` content in a modal (see above).
- **Save as Draft**: a plain save — submits whatever `active`/
  `scheduledPublishAt` the Status field currently maps to, unchanged. It
  does **not** force Draft semantics: if the user set Status to "Scheduled"
  and picked a date, clicking Save as Draft must persist that, not silently
  discard it. "Save as Draft" means "persist my current progress," not
  "override to Draft" — the name describes the common case (most saves
  happen before anything's ready to go live), not a forced side effect.
- **Publish Guide**: the one actual override. Opens the existing
  `ConfirmDialog` (title "Publish this guide?", message explaining the
  override, `confirmLabel="Publish"`); confirming submits with
  `active:true, scheduledPublishAt:null` regardless
  of whatever the Status dropdown currently shows — this button's entire
  purpose is "make this live right now," so it's the one action allowed to
  ignore the dropdown, and the confirm dialog exists specifically because
  it overrides state rather than just persisting it.
- **Dropdown** (chevron next to Publish Guide): the reference shows this
  but doesn't specify its contents anywhere reachable in this stage's
  scope (it's adjacent to Schedule Publish concepts that live on Step 9).
  Deferred — the button renders without a functioning dropdown for now
  (chevron present for visual match, no menu wired up) rather than
  inventing menu contents nothing has specified.
- All three buttons disable during an in-flight submit and show a loading
  label, matching every existing form's `isSubmitting` pattern.

## Validation & Error Handling

Same shape as `ComparisonForm.jsx`: a `validate()` function returning a
`fieldErrors` object, checked before submit; server-side validation errors
(`error.fieldErrors`) merge into the same state on a failed submit. Since
there's only one step right now, there's no "jump to the tab with the
error" logic to build yet (trivial to add when Step 2 exists).

Required-before-save: title, slug (auto-fillable), excerpt, category,
introduction (non-empty text), and — only when Status is Scheduled — a
future publish date. Everything else on this page is optional, matching
the backend's own optionality.

## Explicitly Out of Scope

- Steps 2–9's content (Products, Quick Picks, Comparison, Top Pick,
  Runner-Ups, Buying Guide Content, FAQs, SEO & Publish) — each is a
  future sub-project with its own reference image and design cycle
- Debounced autosaving — the spec's own phrasing ("only if supported by
  the current API") is the out: the API has no distinct autosave
  endpoint, and auto-triggering whole-guide saves via `PUT` while 8 of 9
  sections are still empty/unbuilt is more likely to create confusing
  partial drafts than help; explicit Save as Draft / Publish Guide only
- The header dropdown's menu contents (nothing in reachable scope
  specifies them)
- SEO Title/Description inputs (Step 9's job, not Step 1's, even though
  the backend fields exist today)
- Focus Keyword, SEO Keywords, Canonical URL, Visibility, SEO Score,
  "last saved by" — none of this backend support exists yet (confirmed
  out of scope during the Stage 1 backend design)

## Testing

Matches `ComparisonForm.test.jsx` conventions: render with mocked
`getCategories`/`getBuyingGuideById`/`createBuyingGuide`/
`updateBuyingGuide`, assert on field behavior (slug auto-fill and
dirty-flag, excerpt counter, status-driven publish-date visibility,
TOC add/edit/delete/reorder/toggle, submit payload shape for both create
and edit, validation error display, disabled-during-submit state).
`Stepper`'s disabled-step behavior gets its own small test (steps 2–9
don't navigate on click). `LivePreview` gets a test asserting
it reflects typed-in title/excerpt/TOC state without a save.
