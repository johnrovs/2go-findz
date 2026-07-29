# Design System Stage 9: Comparisons

## Context

This is Stage 9 of the ongoing UI/UX redesign of "2Go Findz". Stage 8
(Pickers & Buying Guides) is complete. Per the split agreed during
Stage 8's brainstorming, this stage covers the remaining Buying
Guides & Comparisons scope: `ComparisonsPage`, `ComparisonForm` (the
tabbed shell) and its 6 tab sub-components in
`frontend/src/components/comparison-form/` (`BasicInfoTab`,
`ProductsTab`, `SpecTableTab`, `SectionsTab`, `FaqTab`, `RelatedTab`),
and `ComparisonFormPage`. Stage 10 (Settings, `SettingsPage` alone) is
the final stage after this.

There is no reference image — the design reuses the exact tokens and
patterns validated across Stages 7–8 (`primary`, `danger`, `success`,
`muted`, `body`, `heading`, `surface-secondary`, `border`,
`rounded-btn`, `text-page-heading`, `text-small`, the `Button`
component). Every file in this stage was checked for class-name test
assertions during planning — none exist (the 6 tabs have no individual
test files; all are exercised through `ComparisonForm.test.jsx`'s 11
integration tests, which query by role/label/text only) — so
retokenizing is safe everywhere.

`RelatedTab.jsx` needs **no direct changes** in this stage: it only
composes `ProductPicker` and `ComparisonPicker`, both already fixed via
`EntityPicker` in Stage 8.

## 1. ComparisonsPage

Identical treatment to `BuyingGuidesPage` in Stage 8:

- Page heading: `text-2xl font-bold text-slate-900` → `text-page-heading
  text-heading`.
- Primary "Add" action: the hand-rolled `bg-indigo-600 ...
  hover:bg-indigo-700` Link → `<Button to="/admin/comparisons/new">`.
- Row-level Edit/Delete icon buttons: `text-slate-500` → `text-muted`,
  `hover:bg-slate-100` → `hover:bg-surface-secondary`,
  `hover:text-indigo-600` → `hover:text-primary`, `hover:text-red-600`
  → `hover:text-danger`.
- Published/Draft status badge: same mapping used for Buying Guides —
  Published `bg-emerald-100 text-emerald-800` → `bg-success/10
  text-success`; Draft `bg-slate-100 text-slate-600` →
  `bg-surface-secondary text-muted`.

## 2. ComparisonForm shell (tabs, error banner, buttons)

Form-level error banner: `bg-red-50 text-red-700` → `bg-danger/10
text-danger`. Cancel/Submit buttons → `<Button variant="secondary">` /
`<Button variant="primary" type="submit">`, preserving the existing
loading-label and `disabled` logic.

**Tab switcher** — the one new UI pattern this stage introduces (no
prior stage has a tab bar):

- Active tab: `border-b-2 border-indigo-600 text-indigo-600` →
  `border-b-2 border-primary text-primary`.
- Inactive tab: `text-slate-500 hover:text-slate-700` → `text-muted
  hover:text-body`.
- Per-tab validation-error dot: `bg-red-500` → `bg-danger`.

No change to tab-switching logic, the `tabHasError` function, or which
tab gets focused on a failed submit.

## 3. BasicInfoTab

Standard field treatment — identical to every form already retokenized
in Stages 7–8 (labels → `text-small font-medium text-body`; text
inputs/textarea/select → `border-border rounded-btn
focus:border-primary focus:ring-primary`; field errors → `text-danger`).
Six fields (Title, Slug, Description, Category, SEO Title, SEO
Description) plus the Published checkbox label all get this treatment.
The embedded `<ImageUploader>` needs no changes (already retokenized in
Stage 6).

## 4. ProductsTab

Its inline product-search UI (search input, "Searching..." text,
results dropdown) is a hand-rolled duplicate of `EntityPicker`'s
pattern rather than a reuse of that component. Refactoring it to
actually use `EntityPicker` is a structural change beyond this stage's
retokenize-only scope, so it stays a separate implementation — but gets
the identical class substitutions `EntityPicker` received in Stage 8
(input: `border-border rounded-btn focus:border-primary
focus:ring-primary`; "Searching...": `text-muted`; results dropdown:
`border-border rounded-btn shadow-card`, item buttons `text-body
hover:bg-surface-secondary`).

The `fieldErrors.products` banner text: `text-red-600` → `text-danger`.

Each selected product's card: border `border-slate-200` → `border-border`,
radius `rounded-md` → `rounded-btn`; up/down/remove icon buttons get the
same treatment as `EntityPicker`'s (`text-muted
hover:bg-surface-secondary`, `hover:text-primary` for up/down,
`hover:text-danger` for remove). The 8-field grid per product (Badge,
Editor's Score, Recommendation, Best For, Main Strength, Main Weakness,
Pros, Cons) gets the standard field treatment from Section 3, and the
per-product pros/cons error text: `text-red-600` → `text-danger`.

## 5. SpecTableTab

Same field treatment for Group Label, Row Label, and each product's
value input, plus the per-product tier `<select>` (BEST/GOOD/STANDARD):
`border-slate-300 ... focus:border-indigo-500` → `border-border ...
focus:border-primary`; radius `rounded-md` → `rounded-btn`.

"Add Row" button: converted from the ad-hoc `bg-indigo-600` button to
`<Button variant="primary" size="sm">`, matching every other primary
"Add" action across the app. Row-remove icon button: `text-slate-500
hover:bg-slate-100 hover:text-red-600` → `text-muted
hover:bg-surface-secondary hover:text-danger`. Row card border
`border-slate-200` → `border-border`; radius `rounded-md` →
`rounded-btn`. The "add products first" placeholder text
(`text-slate-500`) → `text-muted`.

## 6. SectionsTab & FaqTab

Structurally identical repeated-item editors (add/reorder/remove), so
both get the same treatment:

- "Add Section" / "Add FAQ" button: converted from the ad-hoc
  `bg-indigo-600` button to `<Button variant="primary" size="sm">`.
- Reorder (up/down) and remove icon buttons: same treatment as
  `EntityPicker`'s — `text-muted hover:bg-surface-secondary`,
  `hover:text-primary` for up/down, `hover:text-danger` for remove.
- Item card: border `border-slate-200` → `border-border`; radius
  `rounded-md` → `rounded-btn`; item number label (`Section N` / `FAQ N`)
  `text-slate-900` → `text-heading`.
- Field labels/inputs/textareas inside each card: standard treatment
  from Section 3.

## 7. RelatedTab

No changes — inherits fully retokenized `ProductPicker`/
`ComparisonPicker` styling from Stage 8.

## 8. ComparisonFormPage

Page heading: `text-2xl font-bold text-slate-900` → `text-page-heading
text-heading`. No other changes.

## Testing

Every file in this stage was checked for class-name assertions during
planning: `ComparisonsPage.test.jsx` (3 tests), `ComparisonForm.test.jsx`
(11 tests, the only test coverage for all 6 tabs), and
`ComparisonFormPage.test.jsx` (2 tests) all query by role/label/text —
no test updates needed for the retokenization itself.

## Out of Scope for This Stage

- `SettingsPage` — Stage 10, the final stage.
- Refactoring `ProductsTab`'s inline product search to reuse
  `EntityPicker` instead of duplicating its pattern — a structural
  change, not a retokenization, and out of scope here.
- Any change to validation rules, tab-switching logic, drag/reorder
  logic, or submit payload shape for any tab.
