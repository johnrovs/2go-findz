# Design System Stage 10: Settings

## Context

This is Stage 10 — the final stage — of the ongoing UI/UX redesign of
"2Go Findz". Stage 9 (Comparisons) is complete. This stage covers only
`frontend/src/pages/admin/SettingsPage.jsx`, the single largest admin
page file and the last one not yet retokenized.

There is no reference image — the design reuses the exact tokens and
patterns validated across Stages 7–9 (`primary`, `danger`, `border`,
`body`, `heading`, `rounded-btn`, `rounded-card`, `shadow-card`,
`text-page-heading`, `text-card-title`, `text-small`, the `Button`
component). `SettingsPage.test.jsx` (9 tests) queries by role/label/text
only — verified during planning — so retokenizing is safe.

`SettingsPage` is a single form with 4 sections (Branding & Hero
Images, Hero Content, Social Links, Shop Info & Disclosure) and one
Save button. There is no Cancel button today — this page saves
in place rather than being a modal/route pair — so none is added.

## 1. Page heading

`text-2xl font-bold text-slate-900` → `text-page-heading text-heading`,
matching every other admin page.

## 2. Section cards

Each of the 4 `<section>` elements is currently bare — no card chrome,
just vertical spacing (`space-y-10` between sections). This is the one
enhancement in this stage beyond pure retokenization: wrap each section
in the same card treatment used everywhere else in the admin
(`bg-white rounded-card shadow-card p-6`) — `DataTable`, `Modal`, and
`DashboardPage`'s KPI/chart cards all use this pattern, and CLAUDE.md's
"clean cards" UI rule calls for it. A bare section stood out as
unfinished next to every other card-based surface in the app.

Section subheadings (`<h2>`, currently `text-lg font-semibold
text-slate-900`) → `text-card-title text-heading`, matching `Modal`'s
title treatment — both are a "prominent secondary heading within a
card" role.

## 3. Form fields

Identical treatment to every form already retokenized in this
initiative:

- Labels (including the three `ImageUploader` labels — Logo, Hero
  Image, Product Placeholder Image — and all text/textarea labels):
  `text-sm font-medium text-slate-700` → `text-small font-medium
  text-body`.
- Text inputs and textareas (Hero Headline, Hero Description, TikTok
  URL, Pinterest URL, Instagram URL, YouTube URL, Shop Bio, Affiliate
  Disclosure, Contact Email): `border-slate-300 ...
  focus:border-indigo-500 focus:outline-none focus:ring-2
  focus:ring-indigo-500` → `border-border ... focus:border-primary
  focus:outline-none focus:ring-2 focus:ring-primary`; radius
  `rounded-md` → `rounded-btn`.
- Field-level errors (Affiliate Disclosure, Contact Email):
  `text-red-600` → `text-danger`.
- Form-level error banner: `bg-red-50 text-red-700` → `bg-danger/10
  text-danger`.

The three embedded `<ImageUploader>` components need no changes beyond
their label text (already retokenized in Stage 6).

## 4. Save button

Replaced with `<Button type="submit">`, preserving the existing
`isSubmitting` loading-label logic (`'Saving...'` / `'Save Changes'`)
and `disabled` behavior.

## Testing

`SettingsPage.test.jsx` (9 tests) was checked for class-name assertions
during planning — none exist, all queries are by role/label/text — so
no test updates are needed.

## Out of Scope for This Stage

- Any change to settings validation rules, the field set, or the
  save/load request shape.
- No new components — this stage only reuses `Button` and the existing
  card/typography tokens.
- This is the final stage of the design system initiative — no further
  stages follow.
