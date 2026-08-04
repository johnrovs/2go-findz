# Buying Guide — FAQs Step (Step 7) Design

## Goal

Build a production-ready FAQ editor for the buying guide editor's Step 7
("FAQs"): add/edit/delete/reorder FAQs, an accordion Live Preview, and a
functional (preview-only) structured-data generator. Steps 1–6 (Basic Info,
Products, Quick Picks, Comparison, Top Picks & Runner-Ups, Buying Guide)
are already built and must be preserved exactly as-is. SEO & Publish is
untouched.

## Backend reality (confirms scope)

`BuyingGuideFaq` already exists and is fully wired through
`BuyingGuideRequest`/`BuyingGuideResponse` — a genuine "backend ready,
frontend missing" situation, like Quick Picks/Comparison/Top Picks before
their turns. Unlike those, though, a directly analogous sibling is already
shipped: `frontend/src/components/comparison-form/FaqTab.jsx` (built for
Comparison FAQs). It confirms the shape and basic interaction pattern but
is too minimal to reuse as-is (index-keyed with no stable identity, no
drag-and-drop, no delete confirmation, no validation) — this task builds a
proper `ContentSectionEditorCard`/`RunnerUpEditorCard`-grade editor instead.

- Entity fields: `id`, `question` (`@NotBlank`, `@Column(length = 300)`),
  `answer` (`@NotBlank`, `TEXT`, sanitized via `HtmlSanitizer.sanitize` on
  save). **No `visible`/`enabled`/`includeInStructuredData` field exists at
  all** — more minimal than `tocEntries`, which at least has one `visible`
  flag. There is no way to "disable" an FAQ without deleting it, and no
  per-FAQ structured-data toggle is possible without a backend migration.
  Every saved FAQ is implicitly enabled and structured-data-eligible.
- Order comes from `@OrderColumn(name = "display_order")` on the parent
  `BuyingGuide.faqs` `@OneToMany` — the same Hibernate-managed mechanism as
  every other collection in this feature (`tocEntries`, `comparisonSpecs`,
  `recommendationSections`).
- `BuyingGuideServiceImpl` already replaces the whole `faqs` collection on
  every save (same pattern as every sibling collection). No duplicate-
  question check, no blank check beyond `@NotBlank`, no max-count
  validation exists server-side today — this task adds client-side
  gatekeeping matching the spec's own suggested fallback numbers.

## Scope decisions (confirmed)

- **`faqs` state gets a real setter.** Currently
  `const [faqs] = useState(mapFaqsFromResponse(guide?.faqs));` — read-only,
  no editor was ever built. This task adds `setFaqs` and a client-side
  `clientId: crypto.randomUUID()` per item on load, matching the
  established convention (`comparisonSpecs`, `recommendationSections`,
  `tocEntries`) and satisfying "never use array indexes as persistent
  identifiers." Stripped back to `{question, answer}` on save — the exact
  shape the existing round-trip test already asserts.
- **No per-FAQ enabled/structured-data toggle.** The backend has no field
  for it. A second, frontend-only toggle that can't persist is not built,
  per the spec's own fallback instruction ("document it instead of
  creating a frontend-only setting that cannot persist").
- **No FAQ suggestions/AI generation.** No template or suggestion system
  exists anywhere in this codebase (confirmed during research), and the
  spec explicitly says not to introduce AI integration solely for this
  task when no suggestion system already exists.
- **Structured data (JSON-LD) is built and tested, but only previewed in
  the admin editor — not wired into the public guide page.**
  `BuyingGuideDetailPage.jsx` (the real public page) has broad pre-existing
  gaps predating this task — it doesn't render the introduction, quick
  picks, comparison table, top pick, runner-ups, or buying-guide content
  sections either (`guide.content` doesn't even exist on the response DTO
  it reads from). Fixing that page is out of scope for a FAQs-only task,
  matching the exact scoping already applied to `tocEntries`/anchors in
  the prior phase. Per your confirmation, this task builds a pure, unit-
  tested `buildFaqJsonLd(faqs)` utility (matching the proven pattern
  already shipped in `ComparisonDetailPage.jsx`, including its safe
  `script.textContent = JSON.stringify(...)` serialization via the shared
  `useDocumentHead` hook) and shows its live output in a read-only
  "Structured Data Preview" block inside the FAQs step — the spec
  explicitly allows this ("used for validation or preview"), so it's a
  real, working feature, not a placeholder. Ready to wire into the public
  page once that page is actually fixed.

## 1. Stepper and navigation

No stepper structural change — `Stepper.jsx`'s 8 steps stay the same,
`MAX_BUILT_STEP` moves from `6` to `7`. `BuyingGuideForm.jsx` renders the
new step for `activeStep === 7`. Previous returns to Buying Guide (step 6)
without discarding in-progress edits. Next validates, saves with
`stayOnPage: true` (mirroring the fix already applied to every step before
it once the following step gained a real render block —
`handleBuyingGuideContentNext` gets this retrofit now that step 7 exists),
and advances to step 8 (SEO & Publish) — since SEO & Publish has no render
block yet, this becomes the new "last built step" terminal
save-and-return-to-list pattern.

## 2. Page header and FAQ list

Heading "FAQs" + "How it works" popover + "+ Add FAQ" button, supporting
text: "Add frequently asked questions to help readers make confident
buying decisions." Card titled "Frequently Asked Questions ({count})" with
"Drag and drop to reorder FAQs."

Each FAQ renders as a `FaqEditorRow`:
- **Collapsed header**: drag handle, position number, Question input
  (always editable, matching the established convention — not a
  click-to-edit toggle), character counter, expand/collapse toggle,
  delete action.
- **Expanded body**: Answer `<textarea>`, word counter.

Reordering: `@dnd-kit` drag-and-drop plus Move Up/Down buttons as the
keyboard-accessible fallback — the same pattern used by every other
reorderable list in this form.

## 3. Add / Edit / Delete

**Add**: appends `{clientId, question: '', answer: ''}`, auto-expanded,
Question input focused. Disabled at 20 FAQs with an inline explanation.
Below the count, a soft hint appears when fewer than 5 FAQs exist
("Aim for 5–10 FAQs for the best reader experience and search visibility"
— no claim that FAQs improve rankings, matching the spec's own caution).

**Edit**: inline, trimmed on change; blank question or answer blocked
(inline error); a duplicate question (case-insensitive, trimmed) is also
blocked with an inline error — blocking, not a warning, matching the
corrected precedent from the last two phases.

**Delete**: `ConfirmDialog` via a thin `DeleteFaqDialog` wrapper, shown
only when the FAQ has non-blank question or answer (matches the
established "skip dialog for empty items" threshold). Deleting removes it
from `faqs` and renumbers remaining FAQs.

## 4. Live Preview

Adds `FAQS` as a 6th dynamically-numbered key to `computeSectionNumbers()`
(the 5th, `BUYING_GUIDE`, shipped last phase) — present only when
`faqs.length > 0`, using the same "omit if empty" rule as every other
section, so an emptied FAQ list correctly stops producing a numbered
section without a broken TOC link, and reappears once FAQs exist again.

When present: `"{n}. FREQUENTLY ASKED QUESTIONS"` heading, a real
accordion — one `<button aria-expanded>` per FAQ (adapted from
`ComparisonDetailPage.jsx`'s already-proven pattern: independent
open/close state per item, `ChevronDown` rotation, answer rendered as
plain text with preserved line breaks, not HTML, matching how answers are
authored and how the sibling public page already renders them). First 5
shown; if more exist, a "View all {count} questions" control expands the
rest and relabels itself once expanded.

## 5. Structured Data Preview

New `frontend/src/utils/faqJsonLd.js`: pure `buildFaqJsonLd(faqs)`,
filtering out any FAQ with a blank question or answer, producing the exact
`FAQPage`/`Question`/`acceptedAnswer` shape `ComparisonDetailPage.jsx`
already generates. Rendered as a collapsible, read-only formatted `<pre>`
block inside `BuyingGuideFaqsStep`, updating live as FAQs change — genuine
preview, not decoration. Not injected into the DOM as a real
`<script type="application/ld+json">` anywhere in the admin editor (the
spec explicitly reserves that for the published page).

## 6. Validation (Next)

Mirrors the established per-step pattern:
- At least 1 FAQ required to advance (matches the spec's fallback
  "Minimum for progression: 1 completed FAQ").
- Every FAQ needs a non-blank question (≤300 chars) and non-blank answer.
- No two FAQs share the same question (case-insensitive, trimmed).

On failure: stay on the step, inline error summary, expand the first
invalid FAQ, matching the auto-expand pattern shipped for Buying Guide
Content. On success: save (`submit(false, { stayOnPage: true })`) and
unlock/advance to step 8.

## 7. Files

**New:**
- `frontend/src/components/buying-guide-form/FaqEditorRow.jsx` (+ test)
- `frontend/src/components/buying-guide-form/DeleteFaqDialog.jsx` (+ test)
- `frontend/src/components/buying-guide-form/BuyingGuideFaqsStep.jsx` (+ test)
- `frontend/src/utils/faqJsonLd.js` (+ test)

**Modified:**
- `frontend/src/components/BuyingGuideForm.jsx` (+ test) — `faqs` gets a
  real setter, step 7 wiring, validation, `stayOnPage` fix on
  `handleBuyingGuideContentNext`.
- `frontend/src/components/buying-guide-form/LivePreview.jsx` (+ test) —
  FAQ accordion, dynamic numbering retrofit, "View all N questions".
- `frontend/src/components/buying-guide-form/Stepper.jsx` (+ test) —
  `MAX_BUILT_STEP` → 7.

**Backend:** none. Entity, DTOs, sanitizer, and persistence already fully
support this feature.

## Explicitly out of scope for this task

- Fixing `BuyingGuideDetailPage.jsx` (pre-existing, unrelated gaps
  spanning far more than FAQs).
- Wiring JSON-LD into the public page.
- A second "include in structured data" / "enabled" toggle (no backend
  field).
- FAQ suggestions/AI generation (no suggestion system exists anywhere).
- SEO & Publish.
