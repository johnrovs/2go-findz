# Buying Guide Preview Desktop Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking "Desktop" in the buying guide form's sidebar live-preview toggle opens a wide modal (instead of doing nothing useful inside the 28%-wide sidebar column), with its own working Desktop/Mobile toggle inside.

**Architecture:** `Modal.jsx` gains a new `size="xl"` option. `LivePreview.jsx` gains an optional `onRequestDesktopModal` callback prop that, when supplied, intercepts the Desktop button's click instead of changing local state. `BuyingGuideForm.jsx` wires that callback only into its sidebar `LivePreview` instance, opening a second, independent `Modal size="xl"` containing a plain (unmodified-props) `LivePreview`.

**Tech Stack:** React, Tailwind CSS, Vitest, React Testing Library.

## Global Constraints

- The header's existing "Preview" button and its `isPreviewOpen` modal are not touched — same `size="md"`, same behavior, same test.
- When `onRequestDesktopModal` is not passed to `LivePreview`, behavior must be byte-for-byte identical to today (existing `LivePreview.test.jsx` toggle test must keep passing unmodified).
- `LivePreview`'s internal markup (image height, padding, font sizes) is not touched — this change only widens the modal frame, not the preview content's own styling.
- No new npm dependencies.

---

### Task 1: `Modal` `size="xl"` option

**Files:**
- Modify: `frontend/src/components/Modal.jsx:7-10`
- Modify: `frontend/src/components/Modal.test.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `<Modal size="xl">` applies `max-w-5xl` to the dialog. Task 3 depends on this.

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/components/Modal.test.jsx`, immediately after the existing `'applies a wider max-width when size="lg"'` test (currently ending at line 87, just before the closing `});` of the `describe` block):

```jsx
  it('applies an even wider max-width when size="xl"', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Test Modal" size="xl">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByRole('dialog', { name: 'Test Modal' })).toHaveClass('max-w-5xl');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/components/Modal.test.jsx`
Expected: FAIL — `max-w-5xl` is not applied (`xl` isn't a recognized size yet, so `SIZE_CLASSES['xl']` is `undefined`, and the dialog gets no size class at all beyond the base classes).

- [ ] **Step 3: Add the `xl` size**

In `frontend/src/components/Modal.jsx`, change:

```js
const SIZE_CLASSES = {
  md: 'max-w-md',
  lg: 'max-w-3xl',
};
```

to:

```js
const SIZE_CLASSES = {
  md: 'max-w-md',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/components/Modal.test.jsx`
Expected: PASS (all tests in this file, including the new one)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Modal.jsx frontend/src/components/Modal.test.jsx
git commit -m "feat(ui): add Modal size=\"xl\" option"
```

---

### Task 2: `LivePreview` `onRequestDesktopModal` prop

**Files:**
- Modify: `frontend/src/components/buying-guide-form/LivePreview.jsx:31-93`
- Modify: `frontend/src/components/buying-guide-form/LivePreview.test.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `<LivePreview {...existingProps} onRequestDesktopModal={() => void} />` — when provided, clicking the Desktop button calls it instead of changing local `device` state, and the Desktop button's `aria-pressed` is always `false`. When omitted, behavior is identical to today. Task 3 depends on this exact prop name and behavior.

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/components/buying-guide-form/LivePreview.test.jsx`, immediately after the existing `'constrains the panel width when toggled to mobile'` test (ends at line 59, just before the blank line and the next `it('renders the Quick Recommendations section...` test):

```jsx
  it('calls onRequestDesktopModal instead of changing local state when provided', async () => {
    const user = userEvent.setup();
    const onRequestDesktopModal = vi.fn();
    const { container } = render(
      <LivePreview
        title="Guide"
        excerpt="Excerpt"
        coverImageFilename={null}
        tocEntries={[]}
        settings={null}
        onRequestDesktopModal={onRequestDesktopModal}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Preview on mobile' }));
    expect(container.firstChild).toHaveClass('max-w-[375px]');

    await user.click(screen.getByRole('button', { name: 'Preview on desktop' }));

    expect(onRequestDesktopModal).toHaveBeenCalledTimes(1);
    expect(container.firstChild).toHaveClass('max-w-[375px]');
  });
```

This asserts the callback fires **and** that clicking Desktop did *not* revert the local mobile-narrowed state — proving the click was fully intercepted rather than also falling through to `setDevice('desktop')`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/LivePreview.test.jsx`
Expected: FAIL — `onRequestDesktopModal` is not called (the prop doesn't exist yet; clicking Desktop just calls `setDevice('desktop')`, which also removes `max-w-[375px]`, so both assertions fail).

- [ ] **Step 3: Add the prop**

In `frontend/src/components/buying-guide-form/LivePreview.jsx`, change the function signature (currently lines 31-42):

```js
function LivePreview({
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
```

to:

```js
function LivePreview({
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
  onRequestDesktopModal,
}) {
```

Then change the Desktop button (currently lines 75-83):

```jsx
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            aria-label="Preview on desktop"
            aria-pressed={device === 'desktop'}
            className={`rounded-btn p-1.5 ${device === 'desktop' ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-secondary'}`}
          >
            <Monitor size={16} />
          </button>
```

to:

```jsx
          <button
            type="button"
            onClick={() => (onRequestDesktopModal ? onRequestDesktopModal() : setDevice('desktop'))}
            aria-label="Preview on desktop"
            aria-pressed={onRequestDesktopModal ? false : device === 'desktop'}
            className={`rounded-btn p-1.5 ${
              !onRequestDesktopModal && device === 'desktop' ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-secondary'
            }`}
          >
            <Monitor size={16} />
          </button>
```

The Mobile button (lines 84-92) is not touched.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/LivePreview.test.jsx`
Expected: PASS (all tests in this file, including the new one — the pre-existing `'constrains the panel width when toggled to mobile'` test must still pass unmodified, since it never passes `onRequestDesktopModal`)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/LivePreview.jsx frontend/src/components/buying-guide-form/LivePreview.test.jsx
git commit -m "feat(buying-guides): add onRequestDesktopModal prop to LivePreview"
```

---

### Task 3: Wire the sidebar preview into a new wide modal

**Files:**
- Modify: `frontend/src/components/BuyingGuideForm.jsx:114, 776-780, 783-785`
- Modify: `frontend/src/components/BuyingGuideForm.test.jsx`

**Interfaces:**
- Consumes: `Modal` `size="xl"` (Task 1), `LivePreview` `onRequestDesktopModal` (Task 2).
- Produces: nothing consumed elsewhere — this is the final integration point.

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/components/BuyingGuideForm.test.jsx`, immediately after the existing `'opens the live preview modal from the header Preview button'` test (currently lines 563-572):

```jsx
  it('opens a wide modal with a working toggle when Desktop is clicked in the sidebar preview', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Title'), 'Sidebar Desktop Preview');
    await user.click(screen.getByRole('button', { name: 'Preview on desktop' }));

    const dialog = screen.getByRole('dialog', { name: 'Preview' });
    expect(dialog).toHaveClass('max-w-5xl');
    expect(within(dialog).getByText('Sidebar Desktop Preview')).toBeInTheDocument();

    const dialogCard = within(dialog).getByText('Sidebar Desktop Preview').closest('.rounded-card');
    expect(dialogCard).not.toHaveClass('max-w-[375px]');

    await user.click(within(dialog).getByRole('button', { name: 'Preview on mobile' }));

    expect(dialogCard).toHaveClass('max-w-[375px]');
  });
```

At this point in the test, only the sidebar's `LivePreview` is in the DOM (both `Modal`s return `null` while closed), so `screen.getByRole('button', { name: 'Preview on desktop' })` unambiguously targets the sidebar instance.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: FAIL — clicking "Preview on desktop" doesn't open any dialog yet (the sidebar's `LivePreview` isn't passed `onRequestDesktopModal`, so it just calls its own local `setDevice('desktop')`, which is a no-op with no `Modal` involved).

- [ ] **Step 3: Wire the new modal**

In `frontend/src/components/BuyingGuideForm.jsx`, find the existing state declaration (line 114):

```js
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
```

Add a new line directly after it:

```js
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDesktopPreviewOpen, setIsDesktopPreviewOpen] = useState(false);
```

Then find the sidebar block (currently lines 776-780):

```jsx
        <div className="hidden lg:block lg:w-[28%]">
          <div className="sticky top-32">
            <LivePreview {...previewProps} />
          </div>
        </div>
      </div>
```

Change the sidebar's `LivePreview` line to:

```jsx
        <div className="hidden lg:block lg:w-[28%]">
          <div className="sticky top-32">
            <LivePreview {...previewProps} onRequestDesktopModal={() => setIsDesktopPreviewOpen(true)} />
          </div>
        </div>
      </div>
```

Then find the existing header-Preview modal (currently lines 783-785):

```jsx
      <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Preview">
        <LivePreview {...previewProps} />
      </Modal>
```

Add the new modal directly after it, unchanged otherwise:

```jsx
      <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Preview">
        <LivePreview {...previewProps} />
      </Modal>

      <Modal isOpen={isDesktopPreviewOpen} onClose={() => setIsDesktopPreviewOpen(false)} title="Preview" size="xl">
        <LivePreview {...previewProps} />
      </Modal>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: PASS (all tests in this file, including the new one — the pre-existing `'opens the live preview modal from the header Preview button'` test must still pass unmodified)

- [ ] **Step 5: Run the full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: same pass count as the pre-existing baseline, plus every test added across Tasks 1–3 (5 known pre-existing `DashboardHeader.test.jsx` failures are unrelated to this feature and expected to remain).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/BuyingGuideForm.jsx frontend/src/components/BuyingGuideForm.test.jsx
git commit -m "feat(buying-guides): open a wide modal from the sidebar preview's Desktop button"
```

---

## Definition of Done

- `npx vitest run` (from `frontend/`) passes in full, including every test added in Tasks 1–3.
- `npm run build` (from `frontend/`) succeeds.
- Manual verification in a browser:
  1. Open a buying guide form (new or existing) at a viewport ≥1024px wide so the sticky sidebar preview is visible.
  2. Click the sidebar preview's Desktop icon — a wide modal opens showing the same preview card with visibly more surrounding room than the narrow sidebar ever had.
  3. Inside that modal, click Mobile — the card narrows to 375px within the still-open modal; click Desktop again — it widens back, still without closing the modal.
  4. Close the modal (Escape key or clicking the dark backdrop) — the sidebar's own inline preview is unchanged throughout, and the Mobile button in the sidebar (untouched by this change) still narrows the sidebar's own card as before.
  5. Click the form header's "Preview" button — confirm it still opens its own separate, unchanged `md`-sized modal with its own independent toggle.
