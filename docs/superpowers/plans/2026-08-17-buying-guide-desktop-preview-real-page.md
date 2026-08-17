# Buying Guide Desktop Preview Real Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wide "Desktop" preview modal's compact `LivePreview` card with a genuine reproduction of the real published buying guide page's layout, fed by the same live in-progress form data, with no Navbar/Footer and no mobile toggle.

**Architecture:** One new component, `DesktopGuidePreview.jsx`, assembles the real public section components (`BuyingGuideHero`, `GuideTableOfContents`, `QuickRecommendationsSection`, `ProductComparisonSection`, `TopPickSection`, `RunnerUpsSection`, `BuyingGuideContentSection`, `BuyingGuideFaqSection`, `FinalRecommendationSection`) using the exact data-shaping logic `LivePreview.jsx` already has, reused verbatim where the shapes match. `BuyingGuideForm.jsx`'s `isDesktopPreviewOpen` modal swaps its child from `LivePreview` to this new component; nothing else changes.

**Tech Stack:** React, Tailwind CSS, react-i18next, Vitest, React Testing Library.

## Global Constraints

- No Navbar, no PublicFooter, no real `BuyingGuideBreadcrumbs` (its `Link`s would navigate away from the unsaved form) — breadcrumb stays plain inert text, matching `LivePreview`'s existing pattern.
- No Mobile/Desktop toggle inside this new component — always renders the real desktop-style layout (no container-query plugin is installed, so narrowing a wrapper can't correctly reflow the real components' `lg:`/`xl:` classes).
- `FinalRecommendationSection` is included whenever a Top Pick exists (`hasFinalRecommendation: Boolean(topPick)`) — this is a deliberate divergence from `LivePreview`, which hardcodes it to `false`. Do not "fix" this to match `LivePreview`; matching the real page is the point.
- TOC and section labels must come from `t('sections.*')` (the same `guides` i18n namespace the real components already use), **not** from `STRUCTURAL_LABELS` in `TocBuilder.jsx` — that admin-only map has different English text for 3 of 5 labels (`'Comparison Table'` vs. the real `'Product Comparison'`, `'Top Pick'` vs. `'Our Top Pick'`, `'FAQs'` vs. `'Frequently Asked Questions'`), which would make the TOC sidebar visibly disagree with the section headings directly below it — the opposite of the goal.
- The header's separate "Preview" button and its `isPreviewOpen` modal are not touched. `LivePreview.jsx` is not modified.

---

### Task 1: `DesktopGuidePreview` component

**Files:**
- Create: `frontend/src/components/buying-guide-form/DesktopGuidePreview.jsx`
- Test: `frontend/src/components/buying-guide-form/DesktopGuidePreview.test.jsx`

**Interfaces:**
- Consumes: `BuyingGuideHero`, `GuideTableOfContents`, `QuickRecommendationsSection`, `ProductComparisonSection`, `TopPickSection`, `RunnerUpsSection`, `BuyingGuideContentSection`, `BuyingGuideFaqSection`, `FinalRecommendationSection` (all existing, from `frontend/src/components/buying-guide/`, unmodified). `computeGuideSectionNumbers` (existing, from `frontend/src/utils/computeGuideSectionNumbers.js`). `uniqueSlug` (existing, from `frontend/src/utils/slugify.js`).
- Produces: `<DesktopGuidePreview title excerpt coverImageFilename tocEntries settings quickRecommendations comparisonSpecs comparisonProducts recommendationSections faqs />` — identical prop names/shapes/defaults to `LivePreview`. Task 2 depends on this exact prop list.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/buying-guide-form/DesktopGuidePreview.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DesktopGuidePreview from './DesktopGuidePreview.jsx';

describe('DesktopGuidePreview', () => {
  it('renders the title as the hero heading, with a fallback when untitled', () => {
    render(<DesktopGuidePreview title="" excerpt="" coverImageFilename={null} tocEntries={[]} settings={null} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Untitled Guide' })).toBeInTheDocument();
    expect(screen.getByText('Home / Buying Guides / Untitled Guide')).toBeInTheDocument();
  });

  it('renders the title, excerpt, and Quick Recommendations section', () => {
    render(
      <DesktopGuidePreview
        title="Best Earbuds"
        excerpt="A quick roundup."
        coverImageFilename={null}
        tocEntries={[{ clientId: 'QUICK_RECOMMENDATIONS', sectionKey: 'QUICK_RECOMMENDATIONS', title: '', content: '', visible: true }]}
        settings={null}
        quickRecommendations={[
          {
            product: { id: 1, name: 'Soundcore Liberty 4 NC', productPrice: '69.99', productLink: 'https://amazon.com/dp/a', imageFileName: null },
            badgeName: 'Best Overall',
          },
        ]}
      />
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Best Earbuds' })).toBeInTheDocument();
    expect(screen.getByText('A quick roundup.')).toBeInTheDocument();
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('Best Overall')).toBeInTheDocument();
  });

  it('includes the Final Recommendation section when a Top Pick exists, unlike the compact LivePreview card', () => {
    const topPickSection = {
      clientId: 'tp-1',
      product: {
        id: 1,
        name: 'Soundcore Liberty 4 NC',
        imageFileName: null,
        productPrice: '69.99',
        productLink: 'https://amazon.com/dp/a',
        rating: 4.8,
        reviewCount: 12850,
      },
      recommendationType: 'TOP_PICK',
      sectionLabel: 'Best Overall',
      whyRecommended: '<p>Great sound and battery life.</p>',
      pros: [{ clientId: 'p1', content: 'Great sound' }],
      cons: [{ clientId: 'c1', content: 'Pricey' }],
      bestFor: [{ clientId: 'b1', content: 'Daily commuters' }],
    };

    render(
      <DesktopGuidePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[]}
        settings={null}
        recommendationSections={[topPickSection]}
      />
    );

    expect(screen.getByRole('heading', { name: /our top pick/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /final recommendation/i })).toBeInTheDocument();
    expect(screen.getAllByText('Soundcore Liberty 4 NC').length).toBeGreaterThan(0);
  });

  it('shows no optional sections and does not crash when given no data', () => {
    render(<DesktopGuidePreview title="Best Earbuds" excerpt="" coverImageFilename={null} tocEntries={[]} settings={null} />);
    expect(screen.queryByText(/quick recommendations/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /our top pick/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /final recommendation/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/DesktopGuidePreview.test.jsx`
Expected: FAIL — `DesktopGuidePreview.jsx` does not exist yet.

- [ ] **Step 3: Implement `DesktopGuidePreview.jsx`**

Create `frontend/src/components/buying-guide-form/DesktopGuidePreview.jsx`:

```jsx
import { useTranslation } from 'react-i18next';
import BuyingGuideHero from '../buying-guide/BuyingGuideHero.jsx';
import GuideTableOfContents from '../buying-guide/GuideTableOfContents.jsx';
import QuickRecommendationsSection from '../buying-guide/QuickRecommendationsSection.jsx';
import ProductComparisonSection from '../buying-guide/ProductComparisonSection.jsx';
import TopPickSection from '../buying-guide/TopPickSection.jsx';
import RunnerUpsSection from '../buying-guide/RunnerUpsSection.jsx';
import BuyingGuideContentSection from '../buying-guide/BuyingGuideContentSection.jsx';
import BuyingGuideFaqSection from '../buying-guide/BuyingGuideFaqSection.jsx';
import FinalRecommendationSection from '../buying-guide/FinalRecommendationSection.jsx';
import { uniqueSlug } from '../../utils/slugify.js';
import { computeGuideSectionNumbers } from '../../utils/computeGuideSectionNumbers.js';

const noop = () => {};

const STRUCTURAL_ANCHOR_IDS = {
  QUICK_RECOMMENDATIONS: 'quick-recommendations',
  COMPARISON_TABLE: 'product-comparison',
  TOP_PICK: 'top-pick',
  RUNNER_UPS: 'runner-ups',
  FAQS: 'faq',
};

function toRecommendationCardShape(section) {
  return {
    product: section.product,
    recommendationType: section.recommendationType,
    sectionLabel: section.sectionLabel,
    whyRecommended: section.whyRecommended,
    pros: section.pros.map((item) => item.content),
    cons: section.cons.map((item) => item.content),
    bestFor: section.bestFor.map((item) => item.content),
  };
}

function handleNavigate(item) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(item.anchorId)?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
}

function DesktopGuidePreview({
  title,
  excerpt,
  coverImageFilename,
  tocEntries,
  settings,
  quickRecommendations = [],
  comparisonSpecs = [],
  comparisonProducts = [],
  recommendationSections = [],
  faqs = [],
}) {
  const { t } = useTranslation('guides');
  const visibleEntries = tocEntries.filter((entry) => entry.visible);
  const topPick = recommendationSections.find((s) => s.recommendationType === 'TOP_PICK') ?? null;
  const runnerUps = recommendationSections.filter((s) => s.recommendationType === 'RUNNER_UP');
  const topPickShape = topPick ? toRecommendationCardShape(topPick) : null;
  const runnerUpShapes = runnerUps.map(toRecommendationCardShape);

  const customSections = tocEntries.filter(
    (entry) => !entry.sectionKey && entry.visible && entry.title.trim() && entry.content.replace(/<[^>]*>/g, '').trim()
  );
  const hasBuyingGuideContent = customSections.length > 0;
  const usedAnchorSlugs = new Set();
  const contentSections = customSections.map((entry) => ({
    title: entry.title,
    content: entry.content,
    anchorId: uniqueSlug(entry.title, usedAnchorSlugs),
  }));

  const comparisonTable =
    comparisonSpecs.length > 0 && comparisonProducts.length > 0
      ? {
          specificationNames: comparisonSpecs.map((spec) => spec.specificationName || 'Untitled Specification'),
          rows: comparisonProducts.map((product) => ({
            product,
            specificationValues: comparisonSpecs.map(
              (spec) => spec.values.find((v) => v.productId === product.id)?.value ?? ''
            ),
          })),
        }
      : null;

  const faqItems = faqs.map((faq) => ({ question: faq.question, answer: faq.answer }));

  const sectionNumbers = computeGuideSectionNumbers(visibleEntries, {
    hasQuickRecommendations: quickRecommendations.length > 0,
    hasComparison: Boolean(comparisonTable),
    hasTopPick: Boolean(topPick),
    hasBuyingGuideContent,
    hasRunnerUps: runnerUps.length > 0,
    hasFaqs: faqs.length > 0,
    hasFinalRecommendation: Boolean(topPick),
  });

  const structuralLabels = {
    QUICK_RECOMMENDATIONS: t('sections.quickRecommendations'),
    COMPARISON_TABLE: t('sections.comparisonTable'),
    TOP_PICK: t('sections.topPick'),
    RUNNER_UPS: t('sections.runnerUps'),
    FAQS: t('sections.faqs'),
  };

  const tocItems = [];
  let buyingGuideAdded = false;
  visibleEntries.forEach((entry) => {
    if (entry.sectionKey) {
      const number = sectionNumbers[entry.sectionKey];
      if (number) {
        tocItems.push({
          id: entry.sectionKey,
          number,
          label: structuralLabels[entry.sectionKey],
          anchorId: STRUCTURAL_ANCHOR_IDS[entry.sectionKey],
        });
      }
      return;
    }
    if (!buyingGuideAdded && sectionNumbers.BUYING_GUIDE) {
      tocItems.push({ id: 'BUYING_GUIDE', number: sectionNumbers.BUYING_GUIDE, label: t('sections.buyingGuide'), anchorId: 'buying-guide' });
      buyingGuideAdded = true;
    }
  });
  if (sectionNumbers.FINAL_RECOMMENDATION) {
    tocItems.push({
      id: 'FINAL_RECOMMENDATION',
      number: sectionNumbers.FINAL_RECOMMENDATION,
      label: t('sections.finalRecommendation'),
      anchorId: 'final-recommendation',
    });
  }

  return (
    <div>
      <p className="mb-4 text-xs text-muted">Home / Buying Guides / {title || 'Untitled Guide'}</p>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <BuyingGuideHero
          title={title || 'Untitled Guide'}
          excerpt={excerpt}
          coverImageFilename={coverImageFilename}
          updatedAt={null}
          affiliateDisclosure={settings?.affiliateDisclosure}
        />
        <GuideTableOfContents items={tocItems} activeId={null} onNavigate={handleNavigate} />
      </div>

      <div className="mt-6 space-y-10">
        <div id="quick-recommendations">
          <QuickRecommendationsSection
            quickRecommendations={quickRecommendations}
            number={sectionNumbers.QUICK_RECOMMENDATIONS}
            guideId={null}
            onAffiliateClick={noop}
          />
        </div>
        <div id="product-comparison">
          <ProductComparisonSection
            comparisonTable={comparisonTable}
            number={sectionNumbers.COMPARISON_TABLE}
            guideId={null}
            onProductClick={noop}
          />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div id="top-pick">
            <TopPickSection topPick={topPickShape} number={sectionNumbers.TOP_PICK} guideId={null} onAffiliateClick={noop} />
          </div>
          <div id="runner-ups">
            <RunnerUpsSection runnerUps={runnerUpShapes} number={sectionNumbers.RUNNER_UPS} guideId={null} onAffiliateClick={noop} />
          </div>
        </div>
        <div id="buying-guide">
          <BuyingGuideContentSection sections={contentSections} number={sectionNumbers.BUYING_GUIDE} guideId={null} onExpand={noop} />
        </div>
        <div id="faq">
          <BuyingGuideFaqSection faqs={faqItems} number={sectionNumbers.FAQS} guideId={null} />
        </div>
        <div id="final-recommendation">
          <FinalRecommendationSection
            topPick={topPickShape}
            number={sectionNumbers.FINAL_RECOMMENDATION}
            guideId={null}
            onAffiliateClick={noop}
          />
        </div>
      </div>
    </div>
  );
}

export default DesktopGuidePreview;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/DesktopGuidePreview.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/DesktopGuidePreview.jsx frontend/src/components/buying-guide-form/DesktopGuidePreview.test.jsx
git commit -m "feat(buying-guides): add DesktopGuidePreview component"
```

---

### Task 2: Wire it into the sidebar's desktop modal

**Files:**
- Modify: `frontend/src/components/BuyingGuideForm.jsx`
- Modify: `frontend/src/components/BuyingGuideForm.test.jsx`

**Interfaces:**
- Consumes: `DesktopGuidePreview` (Task 1, exact prop list `title excerpt coverImageFilename tocEntries settings quickRecommendations comparisonSpecs comparisonProducts recommendationSections faqs`).
- Produces: nothing consumed elsewhere — final integration point.

- [ ] **Step 1: Update the existing test for the new modal content**

The existing test `'opens a wide modal with a working toggle when Desktop is clicked in the sidebar preview'` in `frontend/src/components/BuyingGuideForm.test.jsx` asserts a `.rounded-card` element and a working Mobile/Desktop toggle *inside the dialog* — both no longer exist once the dialog renders `DesktopGuidePreview` instead of `LivePreview`. Replace that entire test with:

```jsx
  it('opens a wide modal showing the real page layout, with no toggle inside it, when Desktop is clicked in the sidebar preview', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Title'), 'Sidebar Desktop Preview');
    await user.click(screen.getByRole('button', { name: 'Preview on desktop' }));

    const dialog = screen.getByRole('dialog', { name: 'Preview' });
    expect(dialog).toHaveClass('max-w-5xl');
    expect(within(dialog).getByRole('heading', { level: 1, name: 'Sidebar Desktop Preview' })).toBeInTheDocument();

    // Only the sidebar's own toggle button exists now -- the dialog no longer has one.
    expect(screen.getAllByRole('button', { name: 'Preview on desktop' })).toHaveLength(1);
    expect(within(dialog).queryByRole('button', { name: 'Preview on mobile' })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: FAIL — the dialog still renders `LivePreview` (a `<h2>`, not an `<h1>`; still has its own Mobile/Desktop toggle, so `getAllByRole('button', { name: 'Preview on desktop' })` has length 2, not 1).

- [ ] **Step 3: Swap the modal's content**

In `frontend/src/components/BuyingGuideForm.jsx`, add the import alongside the existing `LivePreview` import:

```js
import LivePreview from './buying-guide-form/LivePreview.jsx';
import DesktopGuidePreview from './buying-guide-form/DesktopGuidePreview.jsx';
```

Then change the `isDesktopPreviewOpen` modal (added by the prior feature, directly after the `isPreviewOpen` modal):

```jsx
      <Modal isOpen={isDesktopPreviewOpen} onClose={() => setIsDesktopPreviewOpen(false)} title="Preview" size="xl">
        <LivePreview {...previewProps} />
      </Modal>
```

to:

```jsx
      <Modal isOpen={isDesktopPreviewOpen} onClose={() => setIsDesktopPreviewOpen(false)} title="Preview" size="xl">
        <DesktopGuidePreview {...previewProps} />
      </Modal>
```

The `isPreviewOpen` modal directly above it, and the sidebar's own `<LivePreview {...previewProps} onRequestDesktopModal={...} />`, are both untouched.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: PASS (all tests in this file, including the pre-existing `'opens the live preview modal from the header Preview button'` test, unaffected)

- [ ] **Step 5: Run the full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: same pass count as the pre-existing baseline, plus every test added in Tasks 1–2 (5 known pre-existing `DashboardHeader.test.jsx` failures are unrelated and expected to remain).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/BuyingGuideForm.jsx frontend/src/components/BuyingGuideForm.test.jsx
git commit -m "feat(buying-guides): show the real page layout in the sidebar's desktop preview modal"
```

---

## Definition of Done

- `npx vitest run` (from `frontend/`) passes in full, including every test added in Tasks 1–2.
- `npm run build` (from `frontend/`) succeeds.
- Manual verification in a browser, with a buying guide draft that has a title, quick recommendations, a comparison table, a top pick, runner-ups, a custom content section, and FAQs filled in:
  1. Open the form at a viewport ≥1024px wide, click the sidebar preview's Desktop icon.
  2. Confirm the modal shows a real hero (badge/title/excerpt/image), a sticky table of contents beside it, properly styled sections below (not compact cards), and a Final Recommendation banner at the bottom.
  3. Confirm there is no Mobile/Desktop toggle inside this modal.
  4. Click a table-of-contents entry inside the modal — confirm it scrolls the modal's own content to that section.
  5. Confirm there's no Navbar/Footer, and nothing inside the modal navigates away from the form.
  6. Close the modal — confirm the form and its sidebar preview are unaffected.
  7. Click the header's separate "Preview" button — confirm its own unrelated compact-card modal still works exactly as before.
