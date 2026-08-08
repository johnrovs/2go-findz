# Buying Guide — SEO & Publish Step (Step 8) Design

## Goal

Build a production-ready final step for the buying guide editor's Step 8
("SEO & Publish"): editable SEO metadata with a live search preview, a
deterministic SEO score with a full analysis panel, guide visibility with
real enforcement, a Before You Publish checklist, and a genuinely wired
Publish/Schedule/Draft workflow. Steps 1–7 are already built and must be
preserved exactly as-is, including their state, validation, and the shared
`EditorHeader`/`Stepper`/`LivePreview` chrome.

## Backend reality (confirms scope)

Unlike every prior step, this one is **not** "backend ready, frontend
missing." `seoTitle`/`seoDescription` exist as plain columns on
`BuyingGuide` but are frozen on the frontend today
(`const [seoTitle] = useState(guide?.seoTitle ?? null);` — no setter, no
UI, ever rendered). Nothing else the spec asks for exists:

- No `visibility`, `focusKeyword`, `supportingKeywords`, `canonicalUrl`,
  `robotsIndex`/`robotsFollow`, Open Graph fields, Twitter card type,
  `publishedAt`/`publishedBy`/`updatedBy`, or slug-uniqueness endpoint
  anywhere in the backend.
- **Scheduling is real, not fake**: `BuyingGuidePublishScheduler` is a
  genuine `@Scheduled(fixedRate = 60000)` job that publishes any guide
  whose `scheduledPublishAt` has passed. Status/Publish Date already live
  in **Basic Info (step 1)** and stay there — this task does not build a
  second scheduling mechanism, it reuses the existing state.
- `EditorHeader` already has a sticky header, status badge, Preview, Save
  as Draft, and a working Publish confirmation dialog. Its "More publish
  options" chevron button renders but does nothing — this task is the
  first to wire it up.
- No roles/permissions system exists (`User.role` is a plain string, one
  admin). "Authorization" throughout this task means the existing
  JWT-protected `/api/admin/**` routes — no new RBAC is built.
- No audit-field precedent (`createdBy`/`updatedBy`) exists anywhere in
  the codebase — this task introduces it for the first time, scoped to
  this entity only (a plain username string, not a relation).

## Scope decisions (confirmed)

Four items have zero existing infrastructure and were confirmed **out of
scope**, each with a safe, honest fallback rather than a fake
implementation:

1. **Redirect-on-slug-change** for published guides — no redirects table
   exists. Changing a published guide's slug shows a warn-and-confirm
   dialog; no redirect record is created.
2. **Sitemap inclusion** — no sitemap exists anywhere in the app. Rather
   than persist a checkbox nothing consumes, this control is **omitted
   entirely** from Advanced SEO.
3. **Automated Amazon affiliate-compliance auditing** against the public
   guide page — that page (`BuyingGuideDetailPage.jsx`) is already known
   broken/incomplete from the FAQs phase (doesn't render most sections),
   out of scope then and now.
4. **Cross-domain canonical domain-registry checks** — no domain registry
   exists. Canonical URL validation is a simple same-origin-vs-different
   -origin string comparison against one configured site URL
   (`VITE_SITE_URL`, new env var, falls back to `window.location.origin`
   in dev), with a plain warning, not a registry lookup.

Two more gaps were found during design and handled the same way, without
being asked, because faking them would be worse than omitting them:

5. **Image alt text** — no field exists on the Featured Image anywhere,
   and Basic Info is an already-completed, preserve-don't-redesign step.
   "Image alt text" is excluded from both the SEO score and the Before
   You Publish checklist rather than adding a field to a locked step.
6. **Broken-link validation, mobile-usability validation** — no real
   validation service exists for either. Excluded from the SEO score
   rather than implemented as an always-passing fake check.
7. **Archive status** — the status model has exactly three states
   (`Draft`/`Scheduled`/`Published`, derived from `active` +
   `scheduledPublishAt`). No Archive action is added to the publish
   dropdown.
8. **Affiliate-link-validity / structured-data-validity** as Before You
   Publish checklist items — folded into item 3's deferral; not shown as
   fake-green checks.

## 1. Data model and backend changes

New Flyway migration `V18__add_buying_guide_seo_and_visibility_fields.sql`
adds to `buying_guides`: `focus_keyword`, `canonical_url` (nullable),
`visibility` (varchar, default `PUBLIC`), `robots_index`/`robots_follow`
(boolean, default `true`/`true`), `open_graph_title`/
`open_graph_description`/`open_graph_image_filename` (nullable),
`twitter_card_type` (varchar, default `summary_large_image`),
`published_at` (nullable datetime), `published_by`/`updated_by` (nullable
varchar, populated from the authenticated JWT principal's username in the
service layer). A new `buying_guide_seo_keywords` table
(`@ElementCollection List<String> supportingKeywords`) follows the same
idiom as every other guide sub-list.

`BuyingGuideRequest`/`BuyingGuideResponse`/`BuyingGuideMapper` gain all of
the above; `seoTitle`/`seoDescription` become genuinely persisted from
admin input instead of pass-through-only.

New endpoint `GET /api/admin/buying-guides/check-slug?slug=&excludeId=`
for live uniqueness checking (mirrors the existing slug-uniqueness
constraint already enforced at save time, just exposed for live feedback).

`PublicBuyingGuideController` enforcement (the entire visibility feature):
`getBySlugForPublic` 404s when `visibility == PRIVATE` (in addition to the
existing `!active` check); `getAllForPublic` additionally excludes
`visibility == UNLISTED` from the listing (still reachable by direct
slug).

## 2. SEO Settings form

New `SeoSettingsForm` inside `BuyingGuideSeoPublishStep`, left column.

**SEO Title / Meta Description**: nullable-until-edited state
(`seoTitle`/`metaDescription` default to `null`, matching the existing
frozen scaffolding). Display value falls back to `basicInfo.title`/
`basicInfo.excerpt` until the admin types, at which point the field
becomes "custom" and stays that way through later Basic Info edits. A
"Reset to guide title/excerpt" action sets the field back to `null`
(explicit resync). Character counter + `Check`/`AlertTriangle` icon
(recommended 50–60 / 140–160, framed as guidance) extends the existing
`{count} / {max}` pattern from Excerpt/FAQ fields. Submitted value is
always the effective (non-null) string.

**URL Slug**: unchanged field, still owned by Basic Info (step 1) per the
existing pattern — SEO & Publish only *displays* the computed full URL and
the change-warning; it does not duplicate the slug input itself, since
Basic Info already owns slug editing and this task must not redesign that
step. The live-uniqueness check hits the new `check-slug` endpoint.
Changing the slug while `status === 'Published'` shows a confirm dialog
explaining the URL will change with no redirect (see Scope §1).

**Focus Keyword**: new field, `analyzeFocusKeywordUsage(keyword, {
seoTitle, metaDescription, slug, introduction, tocEntries })` — pure,
case-insensitive substring check against title/description/slug/
stripped-introduction-HTML/custom section titles+content (FAQs excluded,
matching the spec's own location list). Rendered as a ✓/✗ checklist, no
density math, no auto-insertion.

**SEO Keywords**: new `KeywordTagInput.jsx` — Enter/comma adds, Backspace
on empty input removes the last tag, dedupes case-insensitively, trims,
caps at 10 tags / 60 chars each, per-tag labeled remove button, full
keyboard support. Stored as `supportingKeywords: string[]`.

**Canonical URL**: validated with `new URL()` (rejects non-http(s)); blank
defaults to the guide's real public URL
(`${VITE_SITE_URL}/buying-guides/${slug}`); warns (does not block) on a
different origin.

**Google Search Preview**: compact card, real site name "2Go Findz," real
computed URL, live SEO Title/Meta Description, labeled "Preview — actual
results may differ." No second desktop/mobile toggle (the page's existing
`LivePreview` toggle already covers that need elsewhere on this page).

**Advanced SEO** (collapsed by default, same collapsible pattern as FAQs'
"Structured Data Preview"): Robots Index/Follow checkboxes, Open Graph
Title/Description (fallback to SEO Title/Meta Description), Open Graph
Image (fallback to the existing Featured Image), Twitter Card Type select.
No canonical field here (already shown above, not duplicated). No sitemap
toggle (Scope §2).

## 3. SEO Score and Full Analysis

New `computeSeoScore.js`, pure, deterministic, documented inline, no
network call:

| Check | Points | Pass condition |
|---|---|---|
| SEO Title present & 50–60 chars | 15 | 10 if present-but-out-of-range, 15 if in range, 0 if empty |
| Meta Description present & 140–160 chars | 15 | same partial-credit shape |
| Focus Keyword set | 5 | non-empty |
| Keyword in SEO Title | 10 | substring match |
| Keyword in Meta Description | 10 | substring match |
| Keyword in URL Slug | 5 | substring match |
| Keyword in Introduction/Buying Guide content | 10 | substring match |
| Content completeness | 10 | Introduction word count ≥ 40 |
| Valid Canonical URL | 5 | blank or valid absolute http(s) URL |
| Structured data present | 10 | `buildFaqJsonLd(faqs)` (built in the FAQs phase) returns non-null |
| Internal links found | 5 | at least one Quick Pick **and** a Top Pick are set |

Sums to 100. Labels: 0–49 Needs Work, 50–79 Good, 80–100 Excellent. Never
blocks Save as Draft; Publish is still only blocked by the existing
required-field validation from step 1 (title/slug/excerpt/category/
introduction), unchanged.

`SeoAnalysisDialog` (reuses `Modal.jsx`) groups results into
Errors/Warnings/Passed/Suggestions, each with check name, current result,
why it matters, and a recommended action. Clicking an item calls
`onFocusField(step, fieldId)`, which sets `activeStep` and focuses the
field in a render-time effect — the same "adjust state during render, then
focus" mechanism already shipped for invalid-field auto-focus in
`BuyingGuideContentStep`/`BuyingGuideFaqsStep`, not a new pattern.

## 4. Publish Status, Visibility, and the Before You Publish checklist

**Publish Status card** (right column): reads/writes the same
`basicInfo.status`/`scheduledPublishAt` state Basic Info already owns —
no second scheduling mechanism. "Last saved" uses the existing
`guide.updatedAt`; "Saved by" uses the new `updatedBy`. The Publish
confirmation dialog is lifted from `EditorHeader` up into
`BuyingGuideForm` so both the header's Publish button and this card's
Publish button share one dialog/implementation. Schedule Publish opens
`SchedulePublishDialog`, reusing the existing `PublishDatePicker.jsx` (its
naive-local-time convention, already built to avoid DST/timezone bugs, is
reused as-is) and the exact "Scheduled" validation already in step 1's
`validate()`. When already Published, the same action relabels to "Update
Published Guide" — `submit(false)` already keeps `active: true` once
status is Published, so no new save logic is needed, only conditional
copy. "View Live Guide" links to the real public URL.

**Guide Visibility card**: real radio group (`PUBLIC`/`UNLISTED`/
`PRIVATE`, default `PUBLIC`), enforced server-side per §1.

**Before You Publish checklist**: computed from state
`BuyingGuideForm` already holds — `validate()`, `validateQuickPicks()`,
`validateComparison()`, `validateTopPicksAndRunnerUps()`,
`validateBuyingGuideContent()`, `validateFaqs()`, each already existing.
Because every prior step's own Next button already blocks on that step's
validation, most items are structurally guaranteed green by the time an
admin reaches step 8 — documented plainly as a real consequence of the
existing linear gating, not implied as independent discovery. The only
items still live on step 8 are SEO title/description and visibility.
Clicking an item calls `setActiveStep` (the same mechanism `Stepper`
already uses). Affiliate-link-validity and structured-data-validity are
excluded (Scope §8).

**Publish dropdown** (`EditorHeader`'s existing but inert chevron):
Preview, Save as Draft, Schedule Publish, Copy Preview Link (clipboard +
the existing `ToastNotification`), Unpublish (only when already
Published, own confirm dialog). No Archive (Scope §7).

## 5. Layout and responsiveness

`BuyingGuideSeoPublishStep` renders inside the page's existing
`lg:w-[72%]` main column (the page-level right 28% stays `LivePreview`,
unchanged). Internally, it gets its own two-column split — left (SEO
Settings, Search Preview, Advanced SEO) and right (Publish Status, SEO
Score, Guide Visibility, Before You Publish) — activated only at `xl:` so
it doesn't fight the outer split on medium screens; below `xl` the right
cards stack beneath the left column, matching every other step's mobile
behavior. No Next button (final step); Previous returns to FAQs (step 7)
without losing data, same pattern as every other Previous button in this
form.

## 6. Files

**New:**
- `frontend/src/components/buying-guide-form/BuyingGuideSeoPublishStep.jsx` (+ test)
- `frontend/src/components/buying-guide-form/SeoSettingsForm.jsx` (+ test)
- `frontend/src/components/buying-guide-form/KeywordTagInput.jsx` (+ test)
- `frontend/src/components/buying-guide-form/SearchResultPreview.jsx` (+ test)
- `frontend/src/components/buying-guide-form/AdvancedSeoPanel.jsx` (+ test)
- `frontend/src/components/buying-guide-form/SeoAnalysisDialog.jsx` (+ test)
- `frontend/src/components/buying-guide-form/PublishStatusCard.jsx` (+ test)
- `frontend/src/components/buying-guide-form/GuideVisibilityCard.jsx` (+ test)
- `frontend/src/components/buying-guide-form/PrePublishChecklist.jsx` (+ test)
- `frontend/src/components/buying-guide-form/SchedulePublishDialog.jsx` (+ test)
- `frontend/src/components/buying-guide-form/PublishActionMenu.jsx` (+ test)
- `frontend/src/utils/computeSeoScore.js` (+ test)
- `frontend/src/utils/analyzeFocusKeyword.js` (+ test)
- `backend/src/main/resources/db/migration/V18__add_buying_guide_seo_and_visibility_fields.sql`

**Modified:**
- `frontend/src/components/BuyingGuideForm.jsx` (+ test) — new state
  (`visibility`, `focusKeyword`, `supportingKeywords`, `canonicalUrl`,
  advanced SEO fields), real `seoTitle`/`seoDescription` setters, step 8
  wiring, lifted publish-confirmation state.
- `frontend/src/components/buying-guide-form/EditorHeader.jsx` (+ test) —
  publish dialog state lifted out; dropdown menu wired to real actions.
- `frontend/src/components/buying-guide-form/Stepper.jsx` (+ test) —
  `MAX_BUILT_STEP` → 8.
- `frontend/.env` / `.env.example` — new `VITE_SITE_URL`.
- `backend/src/main/java/.../entity/BuyingGuide.java`,
  `dto/request/BuyingGuideRequest.java`,
  `dto/response/BuyingGuideResponse.java`,
  `mapper/BuyingGuideMapper.java`,
  `controller/admin/AdminBuyingGuideController.java` (new check-slug
  endpoint),
  `controller/publicapi/PublicBuyingGuideController.java` (visibility
  enforcement),
  `service/impl/BuyingGuideServiceImpl.java` (+ tests).

## Explicitly out of scope for this task

- Redirect creation on slug change for published guides.
- Sitemap generation/inclusion.
- Automated Amazon affiliate-compliance auditing tied to the public guide
  page (that page remains broken/incomplete from before this task).
- Cross-domain canonical domain-registry checks (simple same-origin
  comparison only).
- Image alt text field/check (no infra on the already-locked Basic Info
  step).
- Broken-link validation, mobile-usability validation (no real service).
- Archive status/action (doesn't exist in the 3-state status model).
- Affiliate-link-validity / structured-data-validity as checklist items.
- Fixing `BuyingGuideDetailPage.jsx` beyond what visibility enforcement
  requires.
