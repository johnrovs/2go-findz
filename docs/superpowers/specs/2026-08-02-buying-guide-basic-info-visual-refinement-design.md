# Buying Guide Basic Info — Visual Refinement (Stage 2, Part 2)

## Context

The Basic Info page (built earlier in this stage) works end-to-end, but the
user provided a more detailed reference screenshot showing a noticeably more
polished target: two-column field layout, helper text under every field, a
fuller Introduction toolbar, different TOC row iconography, a wide 16:9
Featured Image with change/remove controls, and a Live Preview panel with a
functional desktop/mobile toggle and a numbered table of contents.

This is a refinement pass over the already-built, already-merged-pending
components — not a rebuild. The architecture (`BasicInfoStep`, `TocBuilder`,
`IntroductionEditor`, `LivePreview`, `EditorHeader`, `ImageUploader`) stays;
this spec covers the specific visual and behavioral deltas.

**Explicitly out of scope** (confirmed with the user):
- Restructuring `AdminSidebar` into the reference's grouped CONTENT /
  ANALYTICS / MANAGEMENT sections with Traffic/Clicks/Commissions/Reports/
  Users/Integrations — none of those pages exist in this codebase; building
  them is a separate, much larger project.
- Real video/embed functionality in the Introduction toolbar — the two new
  buttons are visual-only stubs.
- Locking custom TOC entries or moving their title/content editing off this
  page — confirmed still inline-editable here, unchanged from the original
  design. The lock icon in the reference applies only to the 5 built-in
  structural rows.

## Layout: two-column grid

`BasicInfoStep.jsx` drops its `max-w-2xl` single-column constraint (it now
fills the existing 72%-width form column `BuyingGuideForm.jsx` already
allocates) and switches to a responsive grid:

```
<div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
```

Row assignment (full-width fields get `lg:col-span-2`):
1. `<h2>Basic Information</h2>` heading — full width
2. Title | Slug — paired
3. Excerpt — full width
4. Category | Featured Image — paired
5. Introduction — full width
6. Table of Contents — full width
7. Status | Publish Date — paired

## Field-by-field changes

Helper text below is transcribed directly from the reference image.

| Field | Change |
|---|---|
| Title | Add helper text: "Use a clear, keyword-rich title." |
| Slug | URL preview text gains a literal `URL: ` prefix: `URL: /buying-guides/<slug or "...">`. |
| Excerpt | Counter format changes from `"N characters remaining"` to `"N / 250"` (matches the reference's `190 / 250`). Add helper text: "A short description for search results and social sharing." |
| Category | Add helper text: "Select the main category." |
| Featured Image | See dedicated section below. |
| Introduction | See dedicated section below. |
| Table of Contents | Heading gains an inline subtitle: `Table of Contents (Customize the sections that appear in your guide)` — subtitle in muted, smaller text. |
| Status | Add helper text: "Set the current status." |
| Publish Date | No longer conditional on Status — always rendered next to Status. Add helper text: "Set when the guide will be published." Validation is unchanged: still only required/checked to be in the future when Status is Scheduled: an admin can pre-fill a date while Status is Draft without it being submitted (`buildPayload` already only sends `scheduledPublishAt` when Status is Scheduled — no change needed there). |

**`BuyingGuideForm.jsx` change:** `handleBasicInfoChange`'s special-cased
`status` branch (which currently clears `scheduledPublishAt` whenever Status
leaves `'Scheduled'`) is removed — Publish Date being permanently visible
means clearing it on every status change would silently discard whatever
date the admin had already picked. The field now falls through to the
generic `{ ...prev, [field]: value }` case like every other field.

## Featured Image: new wide variant

`ImageUploader.jsx` gains two new optional props:
- `variant` (`'square'` default, `'wide'` for the Buying Guide form) —
  Products and Comparisons never pass it, so their rendering is byte-for-byte
  unchanged.
- `helperText` (string, optional, renders below the upload button) — only
  the Buying Guide form passes it.

When `variant="wide"`:
- Preview container becomes `aspect-video w-full` (16:9) instead of
  `h-24 w-24` (square), full width instead of a fixed small box.
- Upload button label becomes `"Change Image"` when a file is already set,
  `"Upload Image"` when empty (existing default/square variant keeps its
  current always-`"Upload Image"` label — this label-swap is wide-only, so
  no existing test's assertion on the literal `"Upload Image"` text breaks).
- A remove button (circular, `Trash2` icon, top-right overlay on the image)
  appears only when `variant="wide"` and a file is set; clicking calls
  `onChange(null)`.
- `helperText` renders under the upload button:
  `"Recommended: 1200x630px (16:9), JPG, PNG or WebP. Max 5MB"`.

The existing hardcoded `alt="Product preview"` stays hardcoded exactly as-is
(not derived from `label` or `variant`) — this preserves every existing
`ImageUploader.test.jsx` assertion (`getByAltText('Product preview')`)
without any change, consistent with how the `label` prop was added earlier
in this same stage.

## Introduction: toolbar and word count

`IntroductionEditor.jsx` adds two toolbar buttons after "Insert image":
- "Insert video" (`Video` icon from `lucide-react`)
- "Insert embed" (`Link2` icon from `lucide-react`)

Both are real `<button>` elements with accessible `aria-label`s but an empty
`onClick` (no-op) — present for visual/accessibility parity with the
reference, not functional yet. A one-line comment notes real embed support
needs its own TipTap extension and is deferred.

Word count display changes from `"{n} words"` (left-aligned, below the
editor) to `"Words: {n}"` (right-aligned, in a bottom bar below the editor
content). The reference's separate "P" paragraph-type indicator (bottom
left) is skipped — it would need live cursor/block-type tracking for a
purely decorative element, not worth the complexity here.

## TOC Builder: row iconography

`TocBuilder.jsx`'s `TocRow` changes, for **every** row type:
- The `Eye`/`EyeOff` visibility button is replaced with a toggle switch,
  reusing `ProductForm.jsx`'s existing "Schedule for later" toggle markup
  verbatim (`role="switch"`, `aria-checked`, `bg-primary`/`bg-slate-300`
  track, sliding white thumb) — not a new visual pattern.
- The `X` delete button becomes a `Trash2` icon (already used the same way
  in `FaqTab.jsx` and elsewhere in this codebase).

For **structural rows only** (`sectionKey` set — the 5 built-in sections):
- A `Lock` icon (`lucide-react`) renders next to the drag handle, before the
  label.
- These rows still have no delete button (unchanged — structural entries
  were never deletable) and no title/content inputs (unchanged).

**Custom rows are unaffected beyond the shared toggle/trash icon swap** —
inline title input, inline content textarea, and the confirm-before-delete
flow for non-blank content all stay exactly as already built. No lock icon
on custom rows.

## Live Preview: device toggle and numbered TOC

`LivePreview.jsx` gains a `Monitor`/`Smartphone` icon pair in its own small
header row (top-right of the panel), matching the reference's device-toggle
icons. Clicking toggles an internal `useState('desktop' | 'mobile')`:
- `desktop` (default): panel renders at its current full width.
- `mobile`: the panel's root wrapper gets a fixed `max-w-[375px] mx-auto`
  constraint, simulating a phone-width preview within the same panel space —
  no separate device frame/chrome, just the width constraint, which is
  enough to preview text wrapping and image cropping at a phone width.

This toggle is local UI state to `LivePreview` itself (not lifted to
`BuyingGuideForm`), since nothing outside the panel needs to know which
device is currently being previewed.

The TOC list becomes numbered: each visible entry renders inside a small
numbered circle (`1`–`9`, reusing the same circle styling `Stepper.jsx`
already established: `flex h-6 w-6 items-center justify-center rounded-full
bg-primary/10 text-xs font-semibold text-primary`) instead of a plain
bulleted list item. No per-section-type icon is added — the reference's
small icons per TOC entry aren't legible enough to identify precisely, and a
numbered circle alone already satisfies "closely match" without guessing at
icon choices that might be wrong.

## Testing

Every existing test file for the touched components gets updated assertions
for the changed text/markup (helper text presence, `"N / 250"` counter
format, `"URL: "` prefix, toggle-switch `role="switch"`/`aria-checked`
instead of `Eye`/`EyeOff` button names, `Trash2`-labelled remove buttons,
`Lock` icon presence scoped to structural rows only, Publish Date always
rendered instead of conditionally, `ImageUploader`'s new `variant`/
`helperText` props). `LivePreview`'s device-toggle test asserts the wrapper
gains/loses the `max-w-[375px]` class on click. No existing passing
assertion is expected to need loosening — this is additive/reformatting,
not a removal of any current guarantee.
