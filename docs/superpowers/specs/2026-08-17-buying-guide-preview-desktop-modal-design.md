# Buying Guide Live Preview — Desktop Modal — Design Spec

## Goal

In the buying guide form's always-visible sidebar preview (`lg:w-[28%]`, roughly 300–360px wide), clicking the "Desktop" toggle currently just removes a `max-w-[375px]` class but still renders inside that same narrow sidebar column — it never actually shows anything resembling a desktop width. Clicking "Desktop" there should instead open a wide modal that gives the same preview card real room, with its own working Desktop/Mobile toggle inside so the user can compare both without closing it.

## Conflicts / decisions resolved with the user before implementation

- **Scope**: this only changes the sidebar's device toggle. The separate, pre-existing "Preview" button in the form header (`EditorHeader.jsx` → `onPreview` → `isPreviewOpen` modal in `BuyingGuideForm.jsx`) is untouched — it keeps its current default (`md`) modal size and its own independent toggle behavior.
- **Modal toggle**: the new wide modal keeps both Desktop/Mobile buttons inside it (not desktop-only), so the user can flip back to mobile without closing the modal.
- **Content styling**: `LivePreview`'s internal markup is not touched. There are no responsive (`lg:`) classes anywhere in it today — device mode only ever toggled the outer `max-w-[375px]` wrapper class. This change only widens the *modal frame*; it does not make the preview card itself look more "desktop" (larger image, different layout, etc.). That's an explicit non-goal for this change.

## Current behavior (for context)

`LivePreview.jsx` owns a local `device` state (`useState('desktop')` — desktop is the default). Two icon buttons (`Monitor`/`Smartphone`, from `lucide-react`) toggle it. The only effect: when `device === 'mobile'`, the outer wrapping `<div>` gets `mx-auto max-w-[375px]`; otherwise no width constraint is applied at all (the card just fills whatever container it's already in).

`BuyingGuideForm.jsx` renders two independent instances of `LivePreview`:
1. Always in the DOM, inside a `hidden lg:block lg:w-[28%]` sticky sidebar column (line ~776–780).
2. Inside a `<Modal isOpen={isPreviewOpen} onClose={...} title="Preview">` (line 783), triggered by the header's "Preview" button via `EditorHeader.jsx`'s `onPreview` callback. `Modal` returns `null` while closed, so this instance isn't in the DOM until opened.

Both pass the exact same `previewProps` spread and are otherwise unstyled/unconfigured — each has its own independent local `device` state today, defaulting to `'desktop'`.

## Component changes

### `Modal.jsx` — new `size="xl"` option

```js
const SIZE_CLASSES = {
  md: 'max-w-md',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};
```
No other changes to `Modal.jsx`. `max-w-5xl` (1024px) is meaningfully wider than the existing `lg` (`max-w-3xl`, 768px) without being edge-to-edge on typical desktop widths.

### `LivePreview.jsx` — new optional `onRequestDesktopModal` prop

```js
function LivePreview({
  // ...existing props unchanged...
  onRequestDesktopModal,
}) {
  const [device, setDevice] = useState('desktop');
  // ...
```

The Desktop button's `onClick` changes from `() => setDevice('desktop')` to:
```jsx
onClick={() => (onRequestDesktopModal ? onRequestDesktopModal() : setDevice('desktop'))}
```
`aria-pressed` changes from `device === 'desktop'` to `onRequestDesktopModal ? false : device === 'desktop'` — when the callback is supplied (sidebar instance), the Desktop button is never the one that reflects "currently selected" locally, since selecting it never changes this instance's own rendering; pressed-state ownership moves to the parent (see below). The Mobile button is completely unchanged (`onClick`, `aria-pressed`, and its narrowing effect on the wrapper `<div>` all stay exactly as they are today).

When `onRequestDesktopModal` is **not** passed (every existing call site except the new sidebar one), behavior is byte-for-byte identical to today — this keeps the existing `LivePreview.test.jsx` toggle test and the header-Preview-modal instance completely unaffected.

### `BuyingGuideForm.jsx` — new modal state, wired to the sidebar instance only

New state: `const [isDesktopPreviewOpen, setIsDesktopPreviewOpen] = useState(false);`

Sidebar instance (line ~778) gains the callback:
```jsx
<LivePreview {...previewProps} onRequestDesktopModal={() => setIsDesktopPreviewOpen(true)} />
```

New modal, rendered alongside the existing `isPreviewOpen` one, not replacing it:
```jsx
<Modal
  isOpen={isDesktopPreviewOpen}
  onClose={() => setIsDesktopPreviewOpen(false)}
  title="Preview"
  size="xl"
>
  <LivePreview {...previewProps} />
</Modal>
```
This second modal's `LivePreview` gets no special props — its own Desktop/Mobile toggle behaves exactly like the header-Preview modal's does today (local state, defaults to `'desktop'`, since that's why this modal was opened).

The existing `isPreviewOpen` state, its `Modal`, and `EditorHeader`'s `onPreview` wiring are all untouched.

## Accessibility

- Sidebar's Desktop button keeps `aria-label="Preview on desktop"` and stays a real `<button>` — it now functions as a modal-open trigger rather than a state toggle, which is a normal, accessible button pattern (no `aria-haspopup` needed since `Modal` already announces itself via `role="dialog"` `aria-modal="true"` `aria-labelledby="modal-title"` on open, matching every other modal trigger in this codebase, e.g. `EditorHeader`'s own "Preview" button).
- `Modal`'s existing focus-trap and Escape-to-close behavior (already implemented, untouched) applies to the new modal exactly as it does to every other `Modal` usage.
- No new ARIA patterns introduced.

## Testing plan

**`Modal.test.jsx`**: add one test mirroring the existing `'applies a wider max-width when size="lg"'` test, asserting `size="xl"` applies `max-w-5xl`.

**`LivePreview.test.jsx`**: add one test — render with `onRequestDesktopModal={vi.fn()}`, click the Desktop button, assert the spy was called once and that the wrapper `<div>` never gains/loses `max-w-[375px]` as a side effect of that click (i.e., confirms local state genuinely didn't change). The existing `'constrains the panel width when toggled to mobile'` test is left completely unchanged and must keep passing unmodified (it doesn't pass `onRequestDesktopModal`, so it's exercising the untouched default path).

**`BuyingGuideForm.test.jsx`**: add one test — `renderForm()`, type a title, click the sidebar's "Preview on desktop" button (unambiguous: at this point only the sidebar's `LivePreview` is in the DOM, since both modals return `null` while closed), assert a `dialog` with heading "Preview" appears containing the typed title, then within that dialog click "Preview on mobile" and assert the dialog's own inline card gains `max-w-[375px]` scoped via `within()` — proving the modal's internal toggle works independently. Also assert the pre-existing header-Preview-button test (`'opens the live preview modal from the header Preview button'`) still passes unmodified, since that flow is untouched.

## Final manual verification

1. Open a buying guide form at a desktop viewport width (≥1024px) so the sticky sidebar is visible.
2. Click the sidebar preview's Desktop icon — confirm a wide modal opens showing the same preview card with visibly more surrounding room than the 28%-wide sidebar ever had.
3. Inside that modal, click Mobile — confirm the card narrows to 375px within the still-open modal, no close/reopen needed.
4. Close the modal (Escape, backdrop click, or an explicit close if one exists) — confirm the sidebar's own inline preview is unaffected/unchanged throughout.
5. Confirm the header's "Preview" button still opens its own separate, unchanged (`md`-sized) modal, with its own independent toggle, completely unaffected by this change.
