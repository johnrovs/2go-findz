# Buying Guide Quick Picks Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Buying Guide editor's Quick Picks step (Step 3): an
editor for the guide's top product recommendations, each with a
deterministically-colored badge, editable badge name, read-only Amazon
link (the product's own `productLink`), drag-and-drop + keyboard-
accessible reordering, and a real "1. Quick Recommendations" section in
the shared Live Preview panel — wired to the actual backend model.

**Architecture:** One small backend validation addition (badge-name
uniqueness — no migration, no new field). Frontend: a new `QuickPickBadge`
component shared between the editor and the extended `LivePreview`; an
`AddQuickPickDialog` built on the existing `Modal`; a
`QuickPickEditorList`/`QuickPickEditorRow` pair mirroring
`SelectedProductsPanel`'s existing dnd-kit reorder pattern exactly; a
`BuyingGuideQuickPicksStep` container; `BuyingGuideForm.jsx` gains a real
`quickRecommendations` setter (currently read-only) and step-3 wiring.

**Tech Stack:** Same as prior buying-guide work — Spring Boot/JUnit/MockMvc
on the backend, React/Vite/Tailwind/`@dnd-kit`/Vitest/RTL on the frontend.

## Global Constraints

- Amazon Link is the product's own `productLink`, displayed read-only —
  no new backend field, no override capability.
- Badge color is deterministic by array index (green/blue/purple/orange/
  red cycling), not stored or user-selectable.
- No Prime indicator, no In Stock badge, no multi-marketplace validation,
  no "configured affiliate ID" warning — none of these have supporting
  data anywhere in the app; omit rather than fabricate.
- Amazon hostname allowlist: `amazon.com`, `amazon.ca`, `amazon.co.uk`,
  `amazon.de` (and their subdomains), hardcoded since no marketplace
  config exists.
- Badge name: required, trimmed, max 30 characters, unique
  (case-insensitive) among a guide's quick picks — enforced both
  client-side (immediate feedback) and server-side (source of truth).
- Reordering uses one mechanism (drag + Up/Down buttons on the same
  rows), not a second conflicting "Display Order" spinner — the row
  shows its current position as a read-only number, matching the
  established `TocBuilder`/`SelectedProductsPanel` pattern.
- Eligible products for Add Quick Pick = the guide's already-loaded
  `recommendedProducts` state minus already-used products — no new
  fetch, no loading/error state for the dialog itself.
- Minimum 1 quick pick to pass Step 3's Next validation; maximum 5
  (Add button disables at 5). Save as Draft is unaffected by this
  minimum.
- Only Steps 1–3 are authorized. `Stepper`'s `MAX_BUILT_STEP` becomes 3;
  steps 4–9 stay disabled regardless of unlock state.

---

### Task 1: Backend — reject duplicate badge names

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java`

**Interfaces:**
- No signature changes — this is additional validation inside the
  existing private `validateRequest(BuyingGuideRequest request)` method.

- [ ] **Step 1: Write the failing test**

Add to `AdminBuyingGuideControllerTest.java`, following the exact pattern
of `create_returns400_whenQuickRecommendationReferencesProductNotInGuide`:

```java
@Test
void create_returns400_whenQuickRecommendationsShareABadgeName() throws Exception {
    String token = adminToken();
    Long guideCategoryId = createCategoryId(token, "Duplicate Badge Guide Category");
    Long productCategoryId = createCategoryId(token, "Duplicate Badge Product Category");
    Long firstProductId = createProductId(token, productCategoryId, "Duplicate Badge Product A");
    Long secondProductId = createProductId(token, productCategoryId, "Duplicate Badge Product B");

    String requestJson = """
            {
              "title": "Duplicate Badge Guide", "slug": "duplicate-badge-guide",
              "excerpt": "Excerpt", "introduction": "Introduction", "coverImageFilename": null,
              "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
              "scheduledPublishAt": null, "recommendedProductIds": [%d, %d],
              "quickRecommendations": [
                {"productId": %d, "badgeName": "Best Overall"},
                {"productId": %d, "badgeName": "best overall"}
              ],
              "comparisonSpecs": [], "recommendationSections": [],
              "faqs": [], "tocEntries": []
            }
            """.formatted(guideCategoryId, firstProductId, secondProductId, firstProductId, secondProductId);

    mockMvc.perform(post("/api/admin/buying-guides")
                    .header("Authorization", "Bearer " + token)
                    .contentType(APPLICATION_JSON)
                    .content(requestJson))
            .andExpect(status().isBadRequest());
}
```

Note the two badge names differ only by case (`"Best Overall"` vs.
`"best overall"`) to prove the check is case-insensitive.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test -Dtest=AdminBuyingGuideControllerTest#create_returns400_whenQuickRecommendationsShareABadgeName`
Expected: FAIL — currently returns 200, since nothing rejects duplicate badge names.

- [ ] **Step 3: Implement**

In `BuyingGuideServiceImpl.validateRequest()`, immediately after the
existing `for (BuyingGuideQuickRecommendationRequest quickRec : ...)`
loop that checks product membership, add:

```java
Set<String> badgeNames = new LinkedHashSet<>();
for (BuyingGuideQuickRecommendationRequest quickRec : request.quickRecommendations()) {
    if (!badgeNames.add(quickRec.badgeName().trim().toLowerCase())) {
        throw new InvalidBuyingGuideException(
                "Two quick picks cannot use the same badge name: \"" + quickRec.badgeName() + "\".");
    }
}
```

(`Set`/`LinkedHashSet` are already imported in this file for the
existing `productIds` check just above.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test -Dtest=AdminBuyingGuideControllerTest`
Expected: PASS, including all prior tests in the file.

- [ ] **Step 5: Run the full backend suite**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test`
Expected: PASS, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java backend/src/test
git commit -m "feat(buying-guides): reject duplicate quick-pick badge names"
```

---

### Task 2: `QuickPickBadge.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/QuickPickBadge.jsx`
- Test: `frontend/src/components/buying-guide-form/QuickPickBadge.test.jsx`

**Interfaces:**
- Produces: `QuickPickBadge({ label, index })` — renders a colored pill.
  `index` selects the color deterministically (`index % 5`). Exported as
  the default export; no other module exports a color helper — both
  `QuickPickEditorRow` and `LivePreview` render `<QuickPickBadge>`
  directly rather than importing a separate color function.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import QuickPickBadge from './QuickPickBadge.jsx';

describe('QuickPickBadge', () => {
  it('renders the label text', () => {
    render(<QuickPickBadge label="Best Overall" index={0} />);
    expect(screen.getByText('Best Overall')).toBeInTheDocument();
  });

  it('assigns different background classes for different indexes', () => {
    const { container: c0 } = render(<QuickPickBadge label="A" index={0} />);
    const { container: c1 } = render(<QuickPickBadge label="B" index={1} />);
    expect(c0.firstChild.className).not.toEqual(c1.firstChild.className);
  });

  it('cycles color after 5 items', () => {
    const { container: c0 } = render(<QuickPickBadge label="A" index={0} />);
    const { container: c5 } = render(<QuickPickBadge label="F" index={5} />);
    expect(c0.firstChild.className).toEqual(c5.firstChild.className);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/QuickPickBadge.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
const BADGE_COLORS = [
  'bg-success text-white',
  'bg-info text-white',
  'bg-primary text-white',
  'bg-warning text-white',
  'bg-danger text-white',
];

function QuickPickBadge({ label, index }) {
  const colorClasses = BADGE_COLORS[index % BADGE_COLORS.length];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colorClasses}`}>
      {label}
    </span>
  );
}

export default QuickPickBadge;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/QuickPickBadge.test.jsx`
Expected: PASS, all 3 cases.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/QuickPickBadge.jsx frontend/src/components/buying-guide-form/QuickPickBadge.test.jsx
git commit -m "feat(buying-guides): add QuickPickBadge with deterministic color-by-position"
```

---

### Task 3: Amazon-link hostname helper

**Files:**
- Create: `frontend/src/utils/amazonLink.js`
- Test: `frontend/src/utils/amazonLink.test.js`

**Interfaces:**
- Produces: `isSupportedAmazonUrl(url: string): boolean` — used by both
  `QuickPickEditorRow` (Task 4) and `LivePreview` (Task 7).

- [ ] **Step 1: Write the failing test**

```js
import { describe, expect, it } from 'vitest';
import { isSupportedAmazonUrl } from './amazonLink.js';

describe('isSupportedAmazonUrl', () => {
  it('accepts https amazon.com links', () => {
    expect(isSupportedAmazonUrl('https://amazon.com/dp/B012XYZ45')).toBe(true);
  });

  it('accepts https subdomains of supported marketplaces', () => {
    expect(isSupportedAmazonUrl('https://www.amazon.co.uk/dp/B012XYZ45')).toBe(true);
  });

  it('rejects http (non-https) links', () => {
    expect(isSupportedAmazonUrl('http://amazon.com/dp/B012XYZ45')).toBe(false);
  });

  it('rejects unsupported hostnames', () => {
    expect(isSupportedAmazonUrl('https://example.com/dp/B012XYZ45')).toBe(false);
  });

  it('rejects malformed URLs without throwing', () => {
    expect(isSupportedAmazonUrl('not a url')).toBe(false);
  });

  it('rejects null or empty input', () => {
    expect(isSupportedAmazonUrl(null)).toBe(false);
    expect(isSupportedAmazonUrl('')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/amazonLink.test.js`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```js
const SUPPORTED_AMAZON_HOSTNAMES = ['amazon.com', 'amazon.ca', 'amazon.co.uk', 'amazon.de'];

export function isSupportedAmazonUrl(url) {
  if (!url) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  return SUPPORTED_AMAZON_HOSTNAMES.some(
    (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/amazonLink.test.js`
Expected: PASS, all 6 cases.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/amazonLink.js frontend/src/utils/amazonLink.test.js
git commit -m "feat(buying-guides): add Amazon hostname allowlist helper"
```

---

### Task 4: `QuickPickEditorRow.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/QuickPickEditorRow.jsx`
- Test: `frontend/src/components/buying-guide-form/QuickPickEditorRow.test.jsx`

**Interfaces:**
- Consumes: `QuickPickBadge` (Task 2), `isSupportedAmazonUrl` (Task 3),
  `getImageUrl` from `../../utils/imageUrl.js` (existing).
- Props: `QuickPickEditorRow({ quickPick, index, total, error, onBadgeNameChange, onMoveUp, onMoveDown, onRemove })`
  where `quickPick` is `{ product, badgeName }` and `product` is a full
  `ProductResponse`-shaped object (id, name, brand, productPrice,
  imageFileName, productLink, rating, reviewCount, ...).

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QuickPickEditorRow from './QuickPickEditorRow.jsx';

const product = {
  id: 1,
  name: 'Soundcore Liberty 4 NC',
  brand: 'Soundcore',
  productPrice: '69.99',
  imageFileName: null,
  productLink: 'https://amazon.com/dp/B012XYZ45?tag=2gofindz-20',
  rating: 4.8,
  reviewCount: 12850,
};

function renderRow(props = {}) {
  return render(
    <QuickPickEditorRow
      quickPick={{ product, badgeName: 'Best Overall' }}
      index={0}
      total={1}
      error={null}
      onBadgeNameChange={vi.fn()}
      onMoveUp={vi.fn()}
      onMoveDown={vi.fn()}
      onRemove={vi.fn()}
      {...props}
    />
  );
}

describe('QuickPickEditorRow', () => {
  it('renders product info and the badge', () => {
    renderRow();
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('Soundcore')).toBeInTheDocument();
    expect(screen.getByText('$69.99')).toBeInTheDocument();
    expect(screen.getByText('Best Overall')).toBeInTheDocument();
    expect(screen.getByText(/12,850/)).toBeInTheDocument();
  });

  it('calls onBadgeNameChange when the badge name input changes', async () => {
    const onBadgeNameChange = vi.fn();
    const user = userEvent.setup();
    renderRow({ onBadgeNameChange });

    await user.type(screen.getByLabelText('Badge Name'), '!');

    expect(onBadgeNameChange).toHaveBeenCalledWith(1, 'Best Overall!');
  });

  it('shows an inline error when provided', () => {
    renderRow({ error: 'Badge name is required.' });
    expect(screen.getByText('Badge name is required.')).toBeInTheDocument();
  });

  it('disables Move up on the first row and Move down on the last row', () => {
    renderRow({ index: 0, total: 1 });
    expect(screen.getByRole('button', { name: 'Move Soundcore Liberty 4 NC up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Soundcore Liberty 4 NC down' })).toBeDisabled();
  });

  it('renders the Amazon link as an external, safe, read-only link', () => {
    renderRow();
    const link = screen.getByRole('link', { name: /open amazon link/i });
    expect(link).toHaveAttribute('href', 'https://amazon.com/dp/B012XYZ45?tag=2gofindz-20');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');
  });

  it('warns when the product link is not a supported Amazon hostname', () => {
    renderRow({
      quickPick: { product: { ...product, productLink: 'https://example.com/dp/x' }, badgeName: 'Best Overall' },
    });
    expect(screen.getByText(/not a recognized amazon link/i)).toBeInTheDocument();
  });

  it('calls onRemove with the product id', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    renderRow({ onRemove });

    await user.click(screen.getByRole('button', { name: 'Remove Soundcore Liberty 4 NC from Quick Picks' }));

    expect(onRemove).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/QuickPickEditorRow.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, ArrowDown, ArrowUp, ExternalLink, GripVertical, Star, Trash2 } from 'lucide-react';
import QuickPickBadge from './QuickPickBadge.jsx';
import { isSupportedAmazonUrl } from '../../utils/amazonLink.js';
import { getImageUrl } from '../../utils/imageUrl.js';

function QuickPickEditorRow({ quickPick, index, total, error, onBadgeNameChange, onMoveUp, onMoveDown, onRemove }) {
  const { product, badgeName } = quickPick;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const imageUrl = getImageUrl(product.imageFileName);
  const isAmazonLinkSupported = isSupportedAmazonUrl(product.productLink);
  const inputId = `quick-pick-badge-name-${product.id}`;

  return (
    <li ref={setNodeRef} style={style} className="rounded-btn border border-border bg-white p-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted">
            {index + 1}
          </span>
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${product.name}`}
            className="cursor-grab rounded-btn p-1 text-muted hover:bg-surface-secondary active:cursor-grabbing"
          >
            <GripVertical size={16} />
          </button>
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              aria-label={`Move ${product.name} up`}
              className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => onMoveDown(index)}
              disabled={index === total - 1}
              aria-label={`Move ${product.name} down`}
              className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowDown size={14} />
            </button>
          </div>
        </div>

        <div className="min-w-[160px] shrink-0">
          <QuickPickBadge label={badgeName || 'Untitled Badge'} index={index} />
          <div className="mt-2 h-20 w-20 overflow-hidden rounded-md bg-slate-100">
            {imageUrl && <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />}
          </div>
        </div>

        <div className="min-w-[180px] flex-1">
          <p className="font-medium text-body">{product.name}</p>
          {product.brand && <p className="text-sm text-muted">{product.brand}</p>}
          <p className="mt-1 font-semibold text-heading">${Number(product.productPrice).toFixed(2)}</p>
          {product.rating != null && (
            <p className="mt-1 flex items-center gap-1 text-sm text-body">
              <Star size={14} className="fill-star text-star" />
              {product.rating}
              <span className="text-muted">({product.reviewCount?.toLocaleString() ?? 0})</span>
            </p>
          )}
          <div className="mt-2 flex items-center gap-1 text-sm">
            <a
              href={product.productLink}
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
              aria-label={`Open Amazon link for ${product.name}`}
              className="inline-flex items-center gap-1 truncate text-primary hover:underline"
            >
              <ExternalLink size={14} />
              <span className="truncate">{product.productLink}</span>
            </a>
          </div>
          {!isAmazonLinkSupported && (
            <p className="mt-1 flex items-center gap-1 text-xs text-warning">
              <AlertTriangle size={14} />
              Not a recognized Amazon link.
            </p>
          )}
        </div>

        <div className="min-w-[220px] flex-1">
          <label htmlFor={inputId} className="mb-1 block text-small font-medium text-body">
            Badge Name <span className="text-danger">*</span>
          </label>
          <input
            id={inputId}
            type="text"
            maxLength={30}
            value={badgeName}
            onChange={(event) => onBadgeNameChange(product.id, event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-muted">Example: Best Overall, Best Battery Life, etc.</p>
          {error && (
            <p id={`${inputId}-error`} role="alert" className="mt-1 text-sm text-danger">
              {error}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRemove(product.id)}
          aria-label={`Remove ${product.name} from Quick Picks`}
          className="shrink-0 rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}

export default QuickPickEditorRow;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/QuickPickEditorRow.test.jsx`
Expected: PASS, all 7 cases.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/QuickPickEditorRow.jsx frontend/src/components/buying-guide-form/QuickPickEditorRow.test.jsx
git commit -m "feat(buying-guides): add QuickPickEditorRow"
```

---

### Task 5: `QuickPickEditorList.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/QuickPickEditorList.jsx`
- Test: `frontend/src/components/buying-guide-form/QuickPickEditorList.test.jsx`

**Interfaces:**
- Consumes: `QuickPickEditorRow` (Task 4), `EmptyState` (existing),
  `@dnd-kit/core`/`@dnd-kit/sortable`/`@dnd-kit/utilities` (existing
  dependency — mirrors `SelectedProductsPanel.jsx`'s exact pattern).
- Props: `QuickPickEditorList({ quickPicks, fieldErrors, onChange })`
  where `quickPicks` is `Array<{ product, badgeName }>` and `fieldErrors`
  is `{ [productId]: string }`.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QuickPickEditorList from './QuickPickEditorList.jsx';

const quickPicks = [
  { product: { id: 1, name: 'Soundcore Liberty 4 NC', productPrice: '69.99', productLink: 'https://amazon.com/dp/a' }, badgeName: 'Best Overall' },
  { product: { id: 2, name: 'TOZO NC9', productPrice: '39.99', productLink: 'https://amazon.com/dp/b' }, badgeName: 'Best Battery Life' },
];

describe('QuickPickEditorList', () => {
  it('shows an empty state with no quick picks', () => {
    render(<QuickPickEditorList quickPicks={[]} fieldErrors={{}} onChange={vi.fn()} />);
    expect(screen.getByText(/no quick picks yet/i)).toBeInTheDocument();
  });

  it('renders one row per quick pick in order', () => {
    render(<QuickPickEditorList quickPicks={quickPicks} fieldErrors={{}} onChange={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Soundcore Liberty 4 NC');
    expect(items[1]).toHaveTextContent('TOZO NC9');
  });

  it('reorders with the up/down buttons', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QuickPickEditorList quickPicks={quickPicks} fieldErrors={{}} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Move TOZO NC9 up' }));

    expect(onChange).toHaveBeenCalledWith([quickPicks[1], quickPicks[0]]);
  });

  it('updates a badge name in place without reordering', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QuickPickEditorList quickPicks={quickPicks} fieldErrors={{}} onChange={onChange} />);

    await user.type(screen.getAllByLabelText('Badge Name')[0], '!');

    expect(onChange).toHaveBeenCalledWith([
      { ...quickPicks[0], badgeName: 'Best Overall!' },
      quickPicks[1],
    ]);
  });

  it('removes a quick pick', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QuickPickEditorList quickPicks={quickPicks} fieldErrors={{}} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Remove TOZO NC9 from Quick Picks' }));

    expect(onChange).toHaveBeenCalledWith([quickPicks[0]]);
  });

  it('passes field errors through to the matching row', () => {
    render(
      <QuickPickEditorList
        quickPicks={quickPicks}
        fieldErrors={{ 2: 'Badge name is required.' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Badge name is required.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/QuickPickEditorList.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import EmptyState from '../EmptyState.jsx';
import QuickPickEditorRow from './QuickPickEditorRow.jsx';

function QuickPickEditorList({ quickPicks, fieldErrors, onChange }) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function handleBadgeNameChange(productId, value) {
    onChange(quickPicks.map((qp) => (qp.product.id === productId ? { ...qp, badgeName: value } : qp)));
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...quickPicks];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === quickPicks.length - 1) return;
    const next = [...quickPicks];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function handleRemove(productId) {
    onChange(quickPicks.filter((qp) => qp.product.id !== productId));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = quickPicks.findIndex((qp) => qp.product.id === active.id);
    const newIndex = quickPicks.findIndex((qp) => qp.product.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...quickPicks];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onChange(next);
  }

  if (quickPicks.length === 0) {
    return (
      <EmptyState
        title="No Quick Picks yet"
        description="Add a Quick Pick to feature your top recommendations at the top of this guide."
      />
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={quickPicks.map((qp) => qp.product.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-3" aria-label="Quick picks">
          {quickPicks.map((quickPick, index) => (
            <QuickPickEditorRow
              key={quickPick.product.id}
              quickPick={quickPick}
              index={index}
              total={quickPicks.length}
              error={fieldErrors[quickPick.product.id]}
              onBadgeNameChange={handleBadgeNameChange}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

export default QuickPickEditorList;
```


- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/QuickPickEditorList.test.jsx`
Expected: PASS, all 6 cases.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/QuickPickEditorList.jsx frontend/src/components/buying-guide-form/QuickPickEditorList.test.jsx frontend/src/components/buying-guide-form/QuickPickEditorRow.jsx
git commit -m "feat(buying-guides): add QuickPickEditorList with drag-and-drop reordering"
```

---

### Task 6: `AddQuickPickDialog.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/AddQuickPickDialog.jsx`
- Test: `frontend/src/components/buying-guide-form/AddQuickPickDialog.test.jsx`

**Interfaces:**
- Consumes: `Modal` (existing), `SearchInput` (existing — but used here
  as a plain controlled local-state input, not wired to any hook),
  `getImageUrl` (existing), `Button` (existing).
- Props: `AddQuickPickDialog({ isOpen, onClose, eligibleProducts, onAdd })`
  where `eligibleProducts` is the pre-filtered array (already-eligible
  products computed by the caller — this component does no filtering
  beyond its own search box).

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AddQuickPickDialog from './AddQuickPickDialog.jsx';

const eligibleProducts = [
  { id: 1, name: 'Soundcore Liberty 4 NC', brand: 'Soundcore', productPrice: '69.99', imageFileName: null, rating: 4.8, reviewCount: 12850 },
  { id: 2, name: 'TOZO NC9', brand: 'TOZO', productPrice: '39.99', imageFileName: null, rating: 4.6, reviewCount: 8430 },
];

describe('AddQuickPickDialog', () => {
  it('does not render when closed', () => {
    render(<AddQuickPickDialog isOpen={false} onClose={vi.fn()} eligibleProducts={eligibleProducts} onAdd={vi.fn()} />);
    expect(screen.queryByText('Add Quick Pick')).not.toBeInTheDocument();
  });

  it('lists eligible products when open', () => {
    render(<AddQuickPickDialog isOpen={true} onClose={vi.fn()} eligibleProducts={eligibleProducts} onAdd={vi.fn()} />);
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('TOZO NC9')).toBeInTheDocument();
  });

  it('filters the list by search text', async () => {
    const user = userEvent.setup();
    render(<AddQuickPickDialog isOpen={true} onClose={vi.fn()} eligibleProducts={eligibleProducts} onAdd={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/search/i), 'tozo');

    expect(screen.queryByText('Soundcore Liberty 4 NC')).not.toBeInTheDocument();
    expect(screen.getByText('TOZO NC9')).toBeInTheDocument();
  });

  it('calls onAdd with the selected product and closes', async () => {
    const onAdd = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AddQuickPickDialog isOpen={true} onClose={onClose} eligibleProducts={eligibleProducts} onAdd={onAdd} />);

    await user.click(screen.getAllByRole('button', { name: 'Add' })[0]);

    expect(onAdd).toHaveBeenCalledWith(eligibleProducts[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an empty state when there are no eligible products', () => {
    render(<AddQuickPickDialog isOpen={true} onClose={vi.fn()} eligibleProducts={[]} onAdd={vi.fn()} />);
    expect(screen.getByText(/every product in this guide is already a quick pick/i)).toBeInTheDocument();
  });

  it('has a Cancel action that closes without adding', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AddQuickPickDialog isOpen={true} onClose={onClose} eligibleProducts={eligibleProducts} onAdd={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/AddQuickPickDialog.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import { useState } from 'react';
import { Image as ImageIcon, Star } from 'lucide-react';
import Modal from '../Modal.jsx';
import Button from '../Button.jsx';
import EmptyState from '../EmptyState.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';

function AddQuickPickDialog({ isOpen, onClose, eligibleProducts, onAdd }) {
  const [search, setSearch] = useState('');

  const filtered = eligibleProducts.filter((product) =>
    product.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  function handleAdd(product) {
    onAdd(product);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Quick Pick">
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search products..."
        aria-label="Search eligible products"
        className="mb-4 w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />

      {eligibleProducts.length === 0 ? (
        <EmptyState
          title="No eligible products"
          description="Every product in this guide is already a Quick Pick. Add more products in the Products step first."
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No products found" description="Try a different search term." />
      ) : (
        <ul className="max-h-96 space-y-2 overflow-y-auto">
          {filtered.map((product) => {
            const imageUrl = getImageUrl(product.imageFileName);
            return (
              <li key={product.id} className="flex items-center justify-between gap-3 rounded-btn border border-border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  {imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="h-12 w-12 shrink-0 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100">
                      <ImageIcon className="h-5 w-5 text-slate-300" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-body">{product.name}</p>
                    <p className="truncate text-xs text-muted">
                      {product.brand || '—'} · ${Number(product.productPrice).toFixed(2)}
                      {product.rating != null && (
                        <>
                          {' '}
                          · <Star size={12} className="inline fill-star text-star" /> {product.rating} (
                          {product.reviewCount?.toLocaleString() ?? 0})
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => handleAdd(product)}>
                  Add
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6 flex justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}

export default AddQuickPickDialog;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/AddQuickPickDialog.test.jsx`
Expected: PASS, all 6 cases.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/AddQuickPickDialog.jsx frontend/src/components/buying-guide-form/AddQuickPickDialog.test.jsx
git commit -m "feat(buying-guides): add AddQuickPickDialog"
```

---

### Task 7: `BuyingGuideQuickPicksStep.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/BuyingGuideQuickPicksStep.jsx`
- Test: `frontend/src/components/buying-guide-form/BuyingGuideQuickPicksStep.test.jsx`

**Interfaces:**
- Consumes: `QuickPickEditorList` (Task 5), `AddQuickPickDialog` (Task 6),
  `Button` (existing).
- Props: `BuyingGuideQuickPicksStep({ quickRecommendations, onChange, recommendedProducts, fieldErrors })`.
  `recommendedProducts` is the guide's Step-2 selection (source of
  eligible products).

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideQuickPicksStep from './BuyingGuideQuickPicksStep.jsx';

const productA = { id: 1, name: 'Soundcore Liberty 4 NC', brand: 'Soundcore', productPrice: '69.99', productLink: 'https://amazon.com/dp/a' };
const productB = { id: 2, name: 'TOZO NC9', brand: 'TOZO', productPrice: '39.99', productLink: 'https://amazon.com/dp/b' };

describe('BuyingGuideQuickPicksStep', () => {
  it('renders the heading and supporting text', () => {
    render(
      <BuyingGuideQuickPicksStep quickRecommendations={[]} onChange={vi.fn()} recommendedProducts={[productA]} fieldErrors={{}} />
    );
    expect(screen.getByRole('heading', { name: 'Quick Picks' })).toBeInTheDocument();
    expect(screen.getByText(/help readers compare the best options/i)).toBeInTheDocument();
  });

  it('toggles the How it works panel', async () => {
    const user = userEvent.setup();
    render(
      <BuyingGuideQuickPicksStep quickRecommendations={[]} onChange={vi.fn()} recommendedProducts={[productA]} fieldErrors={{}} />
    );

    expect(screen.queryByText(/every quick pick must use a product/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'How it works' }));
    expect(screen.getByText(/every quick pick must use a product/i)).toBeInTheDocument();
  });

  it('opens the Add Quick Pick dialog and adds a product to the list', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <BuyingGuideQuickPicksStep quickRecommendations={[]} onChange={onChange} recommendedProducts={[productA]} fieldErrors={{}} />
    );

    await user.click(screen.getByRole('button', { name: 'Add Quick Pick' }));
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onChange).toHaveBeenCalledWith([{ product: productA, badgeName: '' }]);
  });

  it('excludes already-added products from eligible products', async () => {
    const user = userEvent.setup();
    render(
      <BuyingGuideQuickPicksStep
        quickRecommendations={[{ product: productA, badgeName: 'Best Overall' }]}
        onChange={vi.fn()}
        recommendedProducts={[productA, productB]}
        fieldErrors={{}}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add Quick Pick' }));

    expect(screen.queryByText('Soundcore Liberty 4 NC')).not.toBeInTheDocument();
    expect(screen.getByText('TOZO NC9')).toBeInTheDocument();
  });

  it('disables Add Quick Pick at the 5-item maximum', () => {
    const fiveQuickPicks = Array.from({ length: 5 }, (_, i) => ({
      product: { id: i + 1, name: `Product ${i + 1}`, productPrice: '9.99', productLink: 'https://amazon.com/dp/x' },
      badgeName: `Badge ${i + 1}`,
    }));
    render(
      <BuyingGuideQuickPicksStep
        quickRecommendations={fiveQuickPicks}
        onChange={vi.fn()}
        recommendedProducts={fiveQuickPicks.map((qp) => qp.product)}
        fieldErrors={{}}
      />
    );

    expect(screen.getByRole('button', { name: 'Add Quick Pick' })).toBeDisabled();
    expect(screen.getByText(/maximum of 5 quick picks/i)).toBeInTheDocument();
  });

  it('renders the tip notice', () => {
    render(
      <BuyingGuideQuickPicksStep quickRecommendations={[]} onChange={vi.fn()} recommendedProducts={[productA]} fieldErrors={{}} />
    );
    expect(screen.getByText(/drag and drop to reorder your quick picks/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/BuyingGuideQuickPicksStep.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import { useState } from 'react';
import { HelpCircle, Info, Plus } from 'lucide-react';
import Button from '../Button.jsx';
import QuickPickEditorList from './QuickPickEditorList.jsx';
import AddQuickPickDialog from './AddQuickPickDialog.jsx';

const MAX_QUICK_PICKS = 5;

const HOW_IT_WORKS_POINTS = [
  'Quick Picks highlight the best products at the beginning of a buying guide.',
  'Every quick pick must use a product already included in the Products tab.',
  'Each product should have a clear recommendation badge.',
  'The saved order determines the published display order.',
];

function BuyingGuideQuickPicksStep({ quickRecommendations, onChange, recommendedProducts, fieldErrors }) {
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const usedProductIds = new Set(quickRecommendations.map((qp) => qp.product.id));
  const eligibleProducts = recommendedProducts.filter((product) => !usedProductIds.has(product.id));
  const isAtMax = quickRecommendations.length >= MAX_QUICK_PICKS;

  function handleAdd(product) {
    onChange([...quickRecommendations, { product, badgeName: '' }]);
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-card-title text-heading">Quick Picks</h2>
          <button
            type="button"
            aria-expanded={isHowItWorksOpen}
            aria-controls="quick-picks-how-it-works"
            onClick={() => setIsHowItWorksOpen((open) => !open)}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <HelpCircle size={14} />
            How it works
          </button>
        </div>
        <Button type="button" size="sm" disabled={isAtMax} onClick={() => setIsAddDialogOpen(true)}>
          <Plus size={16} />
          Add Quick Pick
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted">
        Add your top quick recommendations. These items will appear at the top of your buying guide to help readers
        compare the best options at a glance.
      </p>

      {isHowItWorksOpen && (
        <ul id="quick-picks-how-it-works" className="mb-4 list-disc space-y-1 rounded-btn bg-surface-secondary p-4 pl-8 text-sm text-body">
          {HOW_IT_WORKS_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}

      {isAtMax && (
        <p className="mb-4 text-sm text-muted">You've reached the maximum of 5 Quick Picks for this guide.</p>
      )}

      <QuickPickEditorList quickPicks={quickRecommendations} fieldErrors={fieldErrors} onChange={onChange} />

      <div className="mt-4 flex items-start gap-2 rounded-btn bg-primary/5 p-4 text-sm text-body">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <p>
          Tip: Drag and drop to reorder your quick picks. The order you set here is the order that will appear on
          your published guide.
        </p>
      </div>

      <AddQuickPickDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        eligibleProducts={eligibleProducts}
        onAdd={handleAdd}
      />
    </div>
  );
}

export default BuyingGuideQuickPicksStep;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/BuyingGuideQuickPicksStep.test.jsx`
Expected: PASS, all 6 cases.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/BuyingGuideQuickPicksStep.jsx frontend/src/components/buying-guide-form/BuyingGuideQuickPicksStep.test.jsx
git commit -m "feat(buying-guides): add BuyingGuideQuickPicksStep"
```

---

### Task 8: Extend `LivePreview.jsx` with the Quick Recommendations section

**Files:**
- Modify: `frontend/src/components/buying-guide-form/LivePreview.jsx`
- Modify: `frontend/src/components/buying-guide-form/LivePreview.test.jsx`

**Interfaces:**
- Consumes: `QuickPickBadge` (Task 2), `isSupportedAmazonUrl` (Task 3).
- `LivePreview` gains a new prop: `quickRecommendations` (defaults to
  `[]` via the caller always passing an array — no default needed in the
  component itself since `BuyingGuideForm.jsx` always has the state).

- [ ] **Step 1: Write the failing test**

Add to `LivePreview.test.jsx` (read the existing file first to match its
exact `render(<LivePreview .../>)` default-props helper before adding):

```jsx
it('renders the Quick Recommendations section when quick picks exist', () => {
  render(
    <LivePreview
      title="Best Earbuds"
      excerpt=""
      coverImageFilename={null}
      tocEntries={[]}
      settings={null}
      quickRecommendations={[
        {
          product: { id: 1, name: 'Soundcore Liberty 4 NC', productPrice: '69.99', productLink: 'https://amazon.com/dp/a', imageFileName: null },
          badgeName: 'Best Overall',
        },
      ]}
    />
  );

  expect(screen.getByText('1. Quick Recommendations')).toBeInTheDocument();
  expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
  expect(screen.getByText('Best Overall')).toBeInTheDocument();
  const cta = screen.getByRole('link', { name: /view on amazon/i });
  expect(cta).toHaveAttribute('href', 'https://amazon.com/dp/a');
  expect(cta).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');
});

it('omits the Quick Recommendations section when there are no quick picks', () => {
  render(
    <LivePreview title="Best Earbuds" excerpt="" coverImageFilename={null} tocEntries={[]} settings={null} quickRecommendations={[]} />
  );
  expect(screen.queryByText(/quick recommendations/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/LivePreview.test.jsx`
Expected: FAIL — the new cases fail (no such section renders yet); all
pre-existing cases in the file still pass.

- [ ] **Step 3: Implement**

In `LivePreview.jsx`, add imports and the prop:

```jsx
import QuickPickBadge from './QuickPickBadge.jsx';
import { isSupportedAmazonUrl } from '../../utils/amazonLink.js';
```

```jsx
function LivePreview({ title, excerpt, coverImageFilename, tocEntries, settings, quickRecommendations }) {
```

After the existing Table of Contents block (before `<AffiliateDisclosure ... />`), add:

```jsx
{quickRecommendations.length > 0 && (
  <div className="mb-4">
    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
      1. Quick Recommendations
    </span>
    <ul className="space-y-3">
      {quickRecommendations.map(({ product, badgeName }, index) => {
        const imageUrl = getImageUrl(product.imageFileName);
        const linkSupported = isSupportedAmazonUrl(product.productLink);
        return (
          <li key={product.id} className="rounded-btn border border-border p-3">
            <QuickPickBadge label={badgeName || 'Untitled Badge'} index={index} />
            <div className="mt-2 flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-surface-secondary">
                {imageUrl && <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-heading">{product.name}</p>
                {product.rating != null && (
                  <p className="text-xs text-muted">
                    ★ {product.rating} ({product.reviewCount?.toLocaleString() ?? 0})
                  </p>
                )}
                <p className="text-sm font-semibold text-heading">${Number(product.productPrice).toFixed(2)}</p>
              </div>
            </div>
            {linkSupported ? (
              <a
                href={product.productLink}
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
                className="mt-2 block rounded-btn bg-amazon px-3 py-1.5 text-center text-sm font-semibold text-white hover:bg-amazon-hover"
              >
                View on Amazon
              </a>
            ) : (
              <span className="mt-2 block rounded-btn bg-slate-200 px-3 py-1.5 text-center text-sm font-semibold text-muted">
                Link unavailable
              </span>
            )}
          </li>
        );
      })}
    </ul>
  </div>
)}
```

(`bg-amazon`/`hover:bg-amazon-hover` already exist in `tailwind.config.js`'s
`colors.amazon` token.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/LivePreview.test.jsx`
Expected: PASS, including every pre-existing case in the file.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/LivePreview.jsx frontend/src/components/buying-guide-form/LivePreview.test.jsx
git commit -m "feat(buying-guides): render Quick Recommendations in Live Preview"
```

---

### Task 9: Wire Quick Picks into `BuyingGuideForm.jsx`

**Files:**
- Modify: `frontend/src/components/buying-guide-form/Stepper.jsx`
- Modify: `frontend/src/components/buying-guide-form/Stepper.test.jsx`
- Modify: `frontend/src/components/BuyingGuideForm.jsx`
- Modify: `frontend/src/components/BuyingGuideForm.test.jsx`

**Interfaces:**
- Consumes: `BuyingGuideQuickPicksStep` (Task 7).
- `quickRecommendations` state changes from
  `useState(mapQuickRecommendationsFromResponse(guide?.quickRecommendations))`
  (read-only, storing `{productId, badgeName}`) to a read-write
  `useState` storing `{product, badgeName}` (full product objects,
  matching the `recommendedProducts` precedent from the Products step).

- [ ] **Step 1: Update `Stepper.jsx`'s max step**

```js
const MAX_BUILT_STEP = 3;
```

Update `Stepper.test.jsx`'s existing "enables Products once unlocked, but
keeps every step after it disabled" test — add a case:

```jsx
it('enables Quick Picks once unlocked, but keeps every step after it disabled', () => {
  render(<Stepper activeStep={3} maxUnlockedStep={3} onStepClick={vi.fn()} />);
  expect(screen.getByRole('button', { name: /Quick Picks/ })).toBeEnabled();
  expect(screen.getByRole('button', { name: /Comparison/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /SEO & Publish/ })).toBeDisabled();
});
```

Run: `cd frontend && npx vitest run src/components/buying-guide-form/Stepper.test.jsx`
Expected: PASS, all 5 cases (4 existing + 1 new).

- [ ] **Step 2: Write the failing `BuyingGuideForm` tests**

Add to `BuyingGuideForm.test.jsx`'s top-level mocks (alongside the
existing `ProductsStep.jsx` mock):

```jsx
vi.mock('./buying-guide-form/BuyingGuideQuickPicksStep.jsx', () => ({
  default: ({ quickRecommendations, onChange }) => (
    <div>
      <p>Quick Picks step ({quickRecommendations.length} added)</p>
      <button
        type="button"
        onClick={() =>
          onChange([...quickRecommendations, { product: { id: 99, name: 'Mock Product' }, badgeName: 'Best Overall' }])
        }
      >
        Add mock quick pick
      </button>
    </div>
  ),
}));
```

Add test cases:

```jsx
it('Next on the Products step advances to Quick Picks and unlocks it in the Stepper', async () => {
  const user = userEvent.setup();
  renderForm();
  await fillRequiredFields(user);
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByText('Products step (0 selected)');

  await user.click(screen.getByRole('button', { name: 'Next' }));

  expect(await screen.findByText('Quick Picks step (0 added)')).toBeInTheDocument();
  const quickPicksButton = screen.getByRole('button', { name: /Quick Picks/ });
  expect(quickPicksButton).toBeEnabled();
  expect(quickPicksButton).toHaveAttribute('aria-current', 'step');
});

it('Previous on Quick Picks returns to Products without losing the selection', async () => {
  const user = userEvent.setup();
  renderForm();
  await fillRequiredFields(user);
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByText('Quick Picks step (0 added)');

  await user.click(screen.getByRole('button', { name: 'Previous' }));

  expect(await screen.findByText('Products step (1 selected)')).toBeInTheDocument();
});

it('adding a quick pick and saving includes it in the quickRecommendations payload', async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  renderForm({ onSubmit });
  await fillRequiredFields(user);
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));

  await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  const payload = onSubmit.mock.calls[0][0];
  expect(payload.quickRecommendations).toEqual([{ productId: 99, badgeName: 'Best Overall' }]);
});

it('Next on Quick Picks blocks with an error when no quick picks have been added', async () => {
  const user = userEvent.setup();
  renderForm();
  await fillRequiredFields(user);
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByText('Quick Picks step (0 added)');

  await user.click(screen.getByRole('button', { name: 'Next' }));

  expect(await screen.findByText(/add at least one quick pick/i)).toBeInTheDocument();
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: FAIL — no second "Next" click target exists past Products yet
(Products step currently has no Next button at all), and
`BuyingGuideQuickPicksStep` isn't wired in.

- [ ] **Step 4: Implement**

In `BuyingGuideForm.jsx`:

Add the import:

```js
import BuyingGuideQuickPicksStep from './buying-guide-form/BuyingGuideQuickPicksStep.jsx';
```

Replace the `quickRecommendations` state line:

```js
const [quickRecommendations, setQuickRecommendations] = useState(
  (guide?.quickRecommendations ?? []).map((r) => ({ product: r.product, badgeName: r.badgeName }))
);
```

Remove the old `mapQuickRecommendationsFromResponse` function entirely —
it's no longer called anywhere (its old callsite was this `useState`
initializer, now replaced above).

In `buildPayload`, change the `quickRecommendations,` line to:

```js
quickRecommendations: quickRecommendations.map(({ product, badgeName }) => ({
  productId: product.id,
  badgeName: badgeName.trim(),
})),
```

Add a `validateQuickPicks()` function near `validate()`:

```js
function validateQuickPicks() {
  const errors = {};
  if (quickRecommendations.length === 0) {
    errors.quickPicksCount = 'Add at least one quick pick before continuing.';
    return errors;
  }
  const seenBadgeNames = new Set();
  quickRecommendations.forEach(({ product, badgeName }) => {
    const trimmed = badgeName.trim();
    if (!trimmed) {
      errors[product.id] = 'Badge name is required.';
      return;
    }
    const key = trimmed.toLowerCase();
    if (seenBadgeNames.has(key)) {
      errors[product.id] = 'Two quick picks cannot use the same badge name.';
      return;
    }
    seenBadgeNames.add(key);
  });
  return errors;
}
```

Add a `handleQuickPicksNext` function near `handleNext`:

```js
function handleQuickPicksNext() {
  const errors = validateQuickPicks();
  setQuickPicksErrors(errors);
  if (Object.keys(errors).length > 0) return;
  setMaxUnlockedStep((prev) => Math.max(prev, 4));
  submit(false);
}
```

(This calls `submit(false)` — the existing Save as Draft path — to
persist, per the spec's "If validation passes: Save the changes" and the
design's decision that Next doesn't navigate anywhere yet since step 4
doesn't exist. `MAX_BUILT_STEP` in `Stepper.jsx` stays 3, so unlocking
"step 4" has no visible effect yet — this is forward-compatible dead
code specifically for when Comparison is built, not a fabricated
destination.)

Add state:

```js
const [quickPicksErrors, setQuickPicksErrors] = useState({});
```

Rename the existing Products-step `handleNext`-equivalent: Products
currently has no Next handler at all. Add one:

```js
function handleProductsNext() {
  setMaxUnlockedStep((prev) => Math.max(prev, 3));
  setActiveStep(3);
}
```

Update the render section: the `activeStep === 2` block gains a Next
button (replacing its `justify-start` single-Previous-button div with a
`justify-between` div containing both), and a new `activeStep === 3`
block is added:

```jsx
{activeStep === 2 && (
  <>
    <ProductsStep
      selectedProducts={recommendedProducts}
      onSelectedProductsChange={setRecommendedProducts}
      categories={categories}
    />
    <div className="mt-6 flex justify-between">
      <Button type="button" variant="secondary" onClick={() => setActiveStep(1)}>
        Previous
      </Button>
      <Button type="button" onClick={handleProductsNext}>
        Next
      </Button>
    </div>
  </>
)}
{activeStep === 3 && (
  <>
    <BuyingGuideQuickPicksStep
      quickRecommendations={quickRecommendations}
      onChange={setQuickRecommendations}
      recommendedProducts={recommendedProducts}
      fieldErrors={quickPicksErrors}
    />
    {quickPicksErrors.quickPicksCount && (
      <p role="alert" className="mt-4 text-sm text-danger">
        {quickPicksErrors.quickPicksCount}
      </p>
    )}
    <div className="mt-6 flex justify-between">
      <Button type="button" variant="secondary" onClick={() => setActiveStep(2)}>
        Previous
      </Button>
      <Button type="button" onClick={handleQuickPicksNext}>
        Next
      </Button>
    </div>
  </>
)}
```

Update `previewProps` to include the new data:

```js
const previewProps = {
  title: basicInfo.title,
  excerpt: basicInfo.excerpt,
  coverImageFilename: basicInfo.coverImageFilename,
  tocEntries,
  settings,
  quickRecommendations,
};
```

Update `<Stepper .../>`'s props — no change needed, it already receives
`activeStep`/`maxUnlockedStep`/`onStepClick` generically.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: PASS, all cases in the file (existing + 4 new).

- [ ] **Step 6: Run the full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: PASS, 0 failures.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/buying-guide-form/Stepper.jsx frontend/src/components/buying-guide-form/Stepper.test.jsx frontend/src/components/BuyingGuideForm.jsx frontend/src/components/BuyingGuideForm.test.jsx
git commit -m "feat(buying-guides): wire Quick Picks step into the guide editor"
```

---

### Task 10: Verification, build, lint, manual browser check

**Files:** none (verification only)

- [ ] **Step 1: Run the full frontend and backend suites**

```bash
cd frontend && npx vitest run
cd ../backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test
```

Expected: PASS, 0 failures in both.

- [ ] **Step 2: Production build**

```bash
cd frontend && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Lint**

```bash
cd frontend && npm run lint
```

Expected: no new errors (fix any introduced by this plan's new files).

- [ ] **Step 4: Manual browser verification (chrome-devtools MCP)**

Start both servers (sourcing `backend/.env` with `set -a`/`set +a` and
copying `frontend/.env` into any fresh worktree first — see project
memory), navigate to an existing Buying Guide with products already
selected, click through to Quick Picks, and verify against the reference
image and the spec's Section 21 checklist:
- Add Quick Pick shows only eligible products (already-selected, not
  already used), with working search and the correct empty states.
- Adding a product creates a row with a colored badge, product info,
  read-only Amazon link (external, safe `rel` attributes), and an
  editable Badge Name field with helper text.
- Badge preview updates immediately as the name is typed.
- Drag-and-drop and the Up/Down buttons both reorder; order numbers
  update; Live Preview's Quick Recommendations section reflects the same
  order.
- Remove takes a row out immediately (no confirmation needed, since
  removal isn't currently gated behind non-blank content per this
  design's simplification — confirm this reads correctly in the running
  app).
- Save as Draft persists; reloading the guide shows the same quick picks
  in the same order with badge names intact (confirms the backend
  round-trip).
- Next with zero quick picks blocks with a visible error; Next with a
  duplicate or blank badge name blocks with a visible error; Next with
  valid data saves successfully.
- Add Quick Pick disables at 5/5 with an explanation.
- Mobile/responsive layout: rows stack without horizontal overflow.
- No new browser console errors.

- [ ] **Step 5: Report completion**

Once every item above is verified — not before — report per the user's
required completion format (files created/modified, components reused,
data-model assumptions, tests/commands run, viewport sizes verified,
remaining warnings), ending with the exact required sentence:

"✅ The Buying Guides Quick Picks tab is complete and verified. Product
recommendations, badges, Amazon affiliate links, ordering, persistence,
validation, and live preview are now implemented."
