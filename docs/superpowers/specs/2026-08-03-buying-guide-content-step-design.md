# Buying Guide — Content Step (Step 6) Design

## Goal

Build a section-based rich-text editor for the buying guide editor's Step 6
("Buying Guide"), letting an admin add, edit, reorder, collapse, and delete
custom content sections (e.g. "How We Tested", "What to Look For") that
appear in the published guide body. Steps 1–5 (Basic Info, Products, Quick
Picks, Comparison, Top Picks & Runner-Ups) are already built and must be
preserved exactly as-is. FAQs and SEO & Publish are untouched.

## Backend reality (confirms scope)

The data model this step needs already exists and is fully wired — this is
purely a frontend UX gap, not a "backend ready, frontend missing" situation
like prior steps. `tocEntries` (managed today via `TocBuilder.jsx` inside
Basic Info) already supports custom entries with both `title` and sanitized
HTML `content`:

- Entity: `BuyingGuideTocEntry` — `sectionKey` (null = custom),
  `title` (`@Column(length = 150)`), `content` (`TEXT`, sanitized via
  `HtmlSanitizer.sanitize`), `visible`. Order is a Hibernate `@OrderColumn`,
  not a field on the entity.
- `BuyingGuideServiceImpl` already replaces the whole `tocEntries`
  collection on every save (same pattern as every other child collection),
  and `validateTocEntries` already rejects a custom entry with a blank
  title or content, and rejects duplicate structural keys.
- `BuyingGuideForm.jsx` already holds `tocEntries`/`setTocEntries` as
  lifted state, already maps it in `buildPayload()`, and already validates
  custom entries (`validate()`'s `tocEntry-${index}` block) before every
  save — including Save as Draft, since backend validation is unconditional.

**Consequence:** Step 6 is a richer, dedicated view onto the *same*
`tocEntries` array `TocBuilder.jsx` already manages, filtered to custom
entries (`sectionKey === null`) only. It is not a new parallel data model.
A section added, renamed, reordered, or deleted here is immediately
reflected in Basic Info's compact TOC list, and vice versa, because both
read/write one shared array — this *is* the spec's requested "Table of
Contents synchronization," achieved by construction rather than by syncing
two separate stores.

## Gaps found during research (things this task must actually fix)

- **Custom section content is never rendered in Live Preview today.**
  `LivePreview.jsx` renders Quick Recommendations, Comparison Table, Top
  Pick, and Runner-Ups, but a custom `tocEntries` item's `.content` is
  currently dropped entirely — it only appears as a plain-text TOC list
  label. This task adds real rendering for it.
- **The TOC list's numbering already disagrees with the section headers'
  numbering.** `computeSectionNumbers()` numbers the four structural
  sections; the TOC `<ul>` numbers via raw array index. They coincidentally
  matched only because custom entries were never interleaved into the
  numbered flow. This task makes both use one shared numbering source.
- **The real public-facing guide page doesn't consume `tocEntries` at
  all** (`BuyingGuideDetailPage.jsx` renders a non-existent `guide.content`
  field and ignores `tocEntries`/quick picks/comparison/recommendations
  entirely) — a pre-existing, unrelated bug. Out of scope here; see below.

## Scope decisions (confirmed)

- **Anchors are client-side/preview-only.** No anchor/scroll-link system
  exists anywhere (admin preview, public page, or backend DTO). Per
  discussion, this task generates slugified, deduped anchor ids purely
  within `LivePreview.jsx` so the preview's TOC list can jump to its
  section inside the preview panel. Nothing is persisted or sent to the
  backend — the backend has no such column, and inventing one would be an
  incompatible duplicate model per the spec's own guidance. The real
  public page not consuming this data yet is a separate, pre-existing gap,
  explicitly out of scope for this task.
- **A shared `RichTextEditor` is extracted.** `IntroductionEditor.jsx` and
  `RecommendationContentEditor.jsx` are near-identical TipTap wrappers with
  hardcoded labels. Per discussion, this task extracts their common logic
  into a generic `RichTextEditor.jsx` (parameterized `id`/`label`/`value`/
  `onChange`/`error`/optional extension set), and refactors both existing
  editors to call it — their external props and rendered behavior stay
  unchanged, so their existing tests continue to prove no regression. Step
  6 uses the same shared component instead of a third copy.
- **One visibility toggle, not two.** The backend has a single `visible`
  boolean per entry — no separate "enabled" vs "included in TOC" field.
  Since the TOC list already only shows visible entries, one toggle
  ("Enabled in published guide") correctly drives both. A second,
  frontend-only toggle that can't persist is not built, per the spec's own
  fallback instruction.
- **No template system.** No category-based section templates exist
  anywhere in this codebase. Building one means hardcoding guesses per
  category, which both CLAUDE.md and the spec's "don't hard-code wireless
  earbuds into every guide" instruction warn against. New guides start
  with zero custom sections and the spec's own prescribed empty state.
- **Add Section has no modal.** Matches `TocBuilder.jsx`'s already-
  established pattern exactly: "+ Add Section" appends a blank entry
  directly to the list, auto-expanded and focused. This satisfies "template
  selector is optional" by simply not offering one (none exist), and keeps
  the UX consistent with the TOC builder editing the same data.

## 1. Stepper and navigation

No stepper structural change — `Stepper.jsx`'s 8 steps and `MAX_BUILT_STEP`
move from `5` to `6`. `BuyingGuideForm.jsx` renders the new step for
`activeStep === 6`. Previous returns to Top Picks & Runner-Ups (step 5)
without discarding in-progress edits. Next validates, saves with
`stayOnPage: true` (mirroring the fix already applied to
`handleQuickPicksNext`/`handleComparisonNext`/`handleTopPicksRunnerUpsNext`
each time a following step gained a real render block), and advances to
step 7 (FAQs) — since FAQs has no render block yet, this again becomes the
"last built step" terminal save-and-return-to-list pattern, exactly as
Comparison's Next once was before Top Picks & Runner-Ups existed.

## 2. Page header and section list

Heading "Buying Guide Content" + "How it works" popover + "+ Add Section"
button, supporting text: "Add helpful information, tips, and expert advice
to help your readers make the best buying decision."

Each custom `tocEntries` entry renders as a `ContentSectionEditorCard`:

- **Collapsed header**: drag handle, position number (1-based among custom
  entries only), title input (always editable, not a click-to-edit
  toggle — matches `RunnerUpEditorCard`/`QuickPickEditorRow` convention),
  expand/collapse toggle, delete action.
- **Expanded body**: `RichTextEditor` (shared component) bound to
  `entry.content`, live word counter, and the single visibility toggle
  ("Enabled in published guide") bound to `entry.visible`.

Multiple sections can be expanded at once (not an accordion), matching
`RunnerUpEditorCard`. A newly added section and the first section with a
validation error auto-expand.

Reordering: `@dnd-kit` drag-and-drop plus Move Up/Down buttons as the
keyboard-accessible fallback — the same pattern used by every other
reorderable list in this form (`TocBuilder`, `RunnerUpsSection`,
`RecommendationListEditor`).

## 3. Add / Edit / Delete

**Add**: appends `{clientId, sectionKey: null, title: '', content: '',
visible: true}` to the end of the custom-entries slice of `tocEntries`,
auto-expanded, title input focused. Client-side only until Save/Next.

**Edit title**: inline input, trimmed on change; blank titles blocked
(inline error, mirrors existing patterns); a duplicate title (case-
insensitive, trimmed) shows a non-blocking warning, matching the Quick
Picks duplicate-badge-name precedent of warning rather than hard-blocking
duplicates that aren't otherwise unsafe.

**Delete**: reuses `ConfirmDialog.jsx` directly via a thin
`DeleteContentSectionDialog` wrapper, shown only when the section has
non-empty content — matching the exact threshold `TocBuilder.jsx` already
uses for its own delete flow. Deleting an empty section skips the dialog.
Deletion removes the entry from `tocEntries` (so the linked TOC/Live
Preview entry disappears with it, by construction) and renumbers remaining
custom sections.

## 4. Shared `RichTextEditor.jsx`

Extracted from `IntroductionEditor.jsx`/`RecommendationContentEditor.jsx`:
TipTap `StarterKit`, `Underline`, `TextAlign` (paragraph/heading), `Link`,
optional `Image` (kept for Introduction's use, omitted for Step 6 and
Recommendation editors, matching their existing scopes), Bold/Italic/
Underline/Bullet+Numbered list/Align left-center-right/Link/Undo/Redo
toolbar, live word counter footer. Props: `{ id, label, value, onChange,
error, withImage? }`. `IntroductionEditor` and `RecommendationContentEditor`
become thin wrappers passing their existing hardcoded label and
`withImage` flag — their rendered output and props are unchanged, so no
consumer of either needs to change.

Output is sanitized server-side the same way Introduction/Recommendation
content already is (`HtmlSanitizer.sanitize`) — already true for
`tocEntries` custom-entry content today, so no backend change is needed
here either.

## 5. Live Preview

Adds a 5th dynamically-numbered section, `BUYING_GUIDE`, to
`computeSectionNumbers()`, using the same "present only if it has content"
rule as the existing four: shown only when at least one custom `tocEntries`
entry is both `visible` and has non-blank title + content.

When present: `"{n}. BUYING GUIDE"` heading, followed by each visible
custom section rendered as its own card — locally numbered 1..N among
custom sections (matching the reference image's "1 How We Tested / 2 What
to Look For..." sub-list), title, sanitized rendered HTML content via the
existing safe-render pattern already used for `whyRecommended`, and a
"Read more" toggle when content exceeds a preview clamp (collapses only
the preview's *display*, never the saved data).

**Anchors (client-side, preview-only)**: each rendered custom section gets
a slugified, deduped `id` (new `frontend/src/utils/slugify.js`, extracted
from the local helper already duplicated in the legacy top-level
`BuyingGuideForm.jsx`). The existing TOC `<ul>` item for that entry becomes
a real `<a href="#anchor">`, scrolling to the section within the preview
panel.

**Numbering consistency fix**: the TOC `<ul>` currently numbers via raw
array index while section headers use `computeSectionNumbers()` — these
diverge once custom sections are interleaved with structural ones. This
task makes the TOC list consume the same computed numbering so both always
agree.

Preview panel stays sticky on desktop; on narrow viewports it already
routes through the existing "Preview" modal, same as every other step.

## 6. Validation (Next)

Mirrors the Quick Picks/Comparison/Top Picks validation pattern — client-
side gating before Next, matching rules the backend already enforces
server-side on every save:

- Every custom entry has a non-blank title.
- Every custom entry has non-blank content.
- (No "at least one section required" gate — an empty Buying Guide step is
  valid; the section is simply omitted from Live Preview and the published
  guide, consistent with every other optional structural section.)

On failure: stay on the step, show an inline error summary, expand the
first invalid section, move focus to its first invalid field. On success:
save (`submit(false, { stayOnPage: true })`) and unlock/advance to step 7.

## 7. Files

**New:**
- `frontend/src/components/buying-guide-form/RichTextEditor.jsx` (+ test)
- `frontend/src/components/buying-guide-form/BuyingGuideContentStep.jsx` (+ test)
- `frontend/src/components/buying-guide-form/ContentSectionEditorCard.jsx` (+ test)
- `frontend/src/components/buying-guide-form/DeleteContentSectionDialog.jsx` (+ test)
- `frontend/src/utils/slugify.js` (+ test)

**Modified:**
- `frontend/src/components/buying-guide-form/IntroductionEditor.jsx` (+ test) — refactored to use `RichTextEditor`, behavior unchanged.
- `frontend/src/components/buying-guide-form/RecommendationContentEditor.jsx` (+ test) — refactored to use `RichTextEditor`, behavior unchanged.
- `frontend/src/components/BuyingGuideForm.jsx` (+ test) — step 6 wiring, validation, `stayOnPage` fix on `handleTopPicksRunnerUpsNext`.
- `frontend/src/components/buying-guide-form/LivePreview.jsx` (+ test) — new Buying Guide section, dynamic numbering retrofit, anchor/scroll links, TOC numbering consistency fix.
- `frontend/src/components/buying-guide-form/Stepper.jsx` (+ test) — `MAX_BUILT_STEP` → 6.

**Backend:** none. Entity, DTOs, sanitizer, and persistence already fully
support this feature.

## Explicitly out of scope for this task

- Fixing `BuyingGuideDetailPage.jsx` (the real public guide page) not
  consuming `tocEntries`/quick picks/comparison/recommendations — a
  pre-existing, unrelated bug with no reference image or go-ahead.
- Persisted/backend anchor ids (no such field in the model).
- A second "include in Table of Contents" toggle (single `visible` field).
- Category-based section templates (no template data exists anywhere).
- FAQs and SEO & Publish steps.
