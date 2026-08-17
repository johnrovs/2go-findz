# Admin Login Page Redesign — Design Spec

## Goal

Redesign the admin login page (`/login`) to match a provided split-screen reference (dark branded left panel, light login card on the right) while preserving the existing username-based authentication API, token handling, and protected-route behavior exactly. Frontend-only change.

## Conflicts resolved with the user before implementation

**Email-labeled field vs. username-based auth** — the reference shows a `type="email"` field with real email-format validation, but the backend's `LoginRequest` has no `email` field at all (only `username`; see `V2__seed_admin_user.sql`, which seeds `johnrovs`, not an email address). Real email validation would block login for the current admin account. Resolved: the field stays wired to the existing `username` value and API call, with `type="text"` and only a required-field check (matching today's behavior) — but its visible label, icon, and placeholder are restyled to read "Email address" / `admin@2gofindz.com` for visual match. The field's `id` stays `username`; only the label text, icon, and required-error copy change (`"Username is required."` → `"Email address is required."`).

**Branding image delivery** — the reference's left-panel visual (logo, "ADMIN COMMAND CENTER" badge, headline, stat cards, "Secure admin access") is supplied as a single flattened image, not markup, per the user's explicit instruction not to recreate its embedded text in HTML. The user will place the file at `frontend/src/assets/admin-login-branding.png` themselves; this design imports it as a normal asset (`import brandingImage from '../assets/admin-login-branding.png'`) rather than fetching it or inlining it, so the page will render with a broken image until that file exists on disk. No fallback/placeholder rendering is built for the missing-file case — this is a one-time setup step, not a runtime condition to design around.

**Tablet breakpoint (768–1023px) — a judgment call, not yet confirmed with the user.** The original request asked for the left panel to *narrow* at tablet widths while staying visible. This design instead uses a single `lg` (1024px) breakpoint: full split layout at ≥1024px, branding panel hidden entirely below it (same as mobile, just with a wider card column). Reasoning: the branding asset is a single flattened image with fixed internal proportions (stat cards, headline) — shrinking its container without cropping or scaling the source image itself risks squeezing that text illegibly, which the user's own image-handling rules ("do not stretch or distort," "preserve the most important image content") argue against. A true three-tier responsive treatment would require either a second, tablet-cropped image export or `object-position` tuning against the actual file, neither of which is possible without the asset in hand. If the user wants real tablet narrowing instead of a hide/show cutover, this can be revisited once the image file exists and its real proportions are known.

## Component architecture

```
pages/LoginPage.jsx                        — composition root; owns useAuth(), validation,
                                              submit handling, already-authenticated redirect
components/admin-login/
  AdminBrandingPanel.jsx                   — <img> only; hidden below 1024px
  AdminLoginCard.jsx                       — card chrome, heading, back-link, form, footer
  FormField.jsx                            — labeled input with a leading icon (generic)
  PasswordField.jsx                        — FormField + trailing show/hide toggle
  AuthErrorAlert.jsx                       — compact red alert, role="alert", aria-live
```

`LoginPage.jsx` keeps all auth/state logic (mirrors the current file's shape); the new components are presentational and receive props. This matches the user's requested component list exactly (`AdminBrandingPanel`, `AdminLoginCard`, `FormField`, `PasswordField`, `AuthErrorAlert`; `AdminLoginPage` is the existing `LoginPage.jsx`, not renamed, to avoid touching the route definition in `App.jsx`).

## Styling approach

New colors and gradients from the reference are applied as **Tailwind arbitrary-value classes scoped to these five new components only** (e.g. `bg-[#5B2CF2]`, `text-[#667085]`, gradient via inline `style={{ background: 'linear-gradient(...)' }}`). The global `.admin-scope` CSS variables in `index.css` (which drive every other admin page's purple accent) are **not** touched — `/login` renders outside `AdminLayout` today and isn't wrapped in `.admin-scope`, and changing shared tokens risks unrelated regressions on pages this task doesn't touch. `Button.jsx`'s existing variants are not extended for this gradient button; the Sign In button's gradient/shadow/hover are local styles on `AdminLoginCard`, since no other page needs this exact gradient.

Color tokens used (from the user's spec, applied literally as arbitrary values, not added to `tailwind.config.js`):
```
Dark navy   #020D18   Dark ink     #0B1629   Primary purple #5B2CF2
Secondary   #7C3AED   Electric blue #4F6BFF  Orange         #FF7A00
Warm bg     #FAFAFC   Muted text   #667085   Borders        #E5EAF2
Error       #DC2626
```

## Layout

`LoginPage.jsx` renders a `min-h-screen` flex row: `AdminBrandingPanel` (`hidden lg:block lg:w-[42%]`) + a right column (`w-full lg:w-[58%]`) containing the back-to-storefront link, centered `AdminLoginCard`, and footer copyright. No page-level scroll on desktop. Below `lg` (1024px), the branding panel is replaced by a small centered `2gofindz.png` logo (the existing asset already used in `AdminSidebar`/nav — not the new branding image, which is desktop-only) above the card.

## AdminBrandingPanel

```jsx
<img
  src={brandingImage}
  alt="2Go Findz Admin Command Center — manage products, buying guides, categories, and performance. 248 products, 56 published guides, 6.94% click rate. Secure admin access."
  className="h-full w-full object-cover object-center"
/>
```
Full alt text carries the embedded stats/copy for screen readers (satisfies "visually hidden accessible text" via a descriptive `alt` rather than a separate hidden element, since the image has no other content around it to attach the description to). `loading="eager"` (above the fold, no lazy-load flash).

## AdminLoginCard

- Card: `bg-white`, `border border-[#E5EAF2]/70`, multi-layer `shadow-[...]`, `rounded-[22px]`, `max-w-[520px] w-full`, padding `p-11` (44px), positioned via a 4px top strip using the gradient (`linear-gradient(90deg,#5b2cf2,#7c3aed,#ff7a00)`) as a separate absolutely-positioned div (simpler and safer than a border-image hack).
- Icon: rounded-square (`h-[72px] w-[72px] rounded-[20px]`) purple-gradient div containing `ShieldCheck` from `lucide-react` (already a dependency; no new icon lib), white, centered, with a soft `shadow-[0_0_30px_rgba(91,44,242,0.35)]` glow.
- Heading: "Welcome back" (`text-4xl font-extrabold text-[#0B1629]`), subtitle "Sign in to your 2Go Findz admin account." (`text-[#667085]`), both centered.
- Back link: `<Link to="/">` top-right of the right column (not inside the card), `ArrowLeft` icon + "Back to storefront", muted color with purple hover, visible focus ring.
- Form: `FormField` for the email-labeled/username-bound input (`Mail` icon), `PasswordField` for password (`Lock` icon leading, `Eye`/`EyeOff` trailing toggle — reuses the exact toggle behavior already in `LoginPage.jsx` today, just moved into the new component), both `h-[52px] rounded-[13px] bg-[#FAFAFC] border border-[#E5EAF2]` with `focus:border-[#5B2CF2] focus:ring-2 focus:ring-[#5B2CF2]/30`.
- No remember-me / forgot-password row — button sits ~24px below the password field directly.
- Sign In button: full-width, `h-[54px] rounded-[13px]`, gradient background, `ArrowRight` icon right-aligned, `font-bold`, hover lift (`hover:-translate-y-0.5 transition-transform`), spinner + "Signing in..." + `disabled` while `isSubmitting` (same state already in `LoginPage.jsx`, just re-skinned).
- "ADMIN PORTAL" divider: two `border-t border-[#E5EAF2]` lines flanking small centered muted-purple-gray uppercase text, `Lock` icon + "Authorized administrators only." beneath.
- `AuthErrorAlert`: renders above the form fields (inside the card) when `formError` is set — light-red background, `AlertCircle`-style icon (or reuse whatever icon convention exists elsewhere in the app for error alerts, if any), `role="alert"`, red text meeting contrast requirements. Card height is allowed to grow slightly to fit it (per the user's "without changing dimensions *significantly*" allowance) rather than reserving permanent empty space for it.

## Footer

`© 2026 2Go Findz. All rights reserved.` — small muted text, centered, below the card, outside `AdminLoginCard`, in the right column only (not spanning full page width).

## Auth behavior changes vs. current `LoginPage.jsx`

1. **New:** already-authenticated admins visiting `/login` are redirected to `/admin` immediately (`isAuthenticated` from `useAuth()` checked before rendering the form) — this does not exist today.
2. **Unchanged:** `login(username, password)` call, redirect-to-originally-requested-page (`location.state?.from?.pathname`), localStorage token/user persistence, `ProtectedRoute` role/redirect behavior — none of this is touched.
3. **Unchanged validation:** required-field checks only (email format is intentionally not enforced, per the resolved conflict above).
4. **Copy change:** `"Username is required."` → `"Email address is required."` (both the validation message and the `htmlFor`/label pairing update together).

## Responsive behavior

- **≥1024px:** full split layout, branding panel ~42%/card column ~58%, as designed above.
- **768–1023px:** branding panel remains but narrows (`lg:w-[42%]` only applies ≥1024px; between 768–1023px the panel is hidden per the "≥1024px" breakpoint choice — the user's tablet spec said "reduce the left panel width," but since the source image can't be safely cropped further without losing the stat cards, and the user separately said mobile must hide the panel and show a compact logo instead, this design uses a single breakpoint at `lg` (1024px) for that switch rather than a three-tier width reduction, to keep the image legible or absent, never squeezed illegibly). Card padding drops to `p-8`, no horizontal overflow.
- **<768px:** compact `2gofindz.png` logo above the card, full-width card (`max-w-[calc(100%-40px)]`), `px-5` (20px) page padding, back-link stays visible top-right, Sign In button stays full-width.

## Animation

If `prefers-reduced-motion` is not set, `AdminLoginCard` fades/slides up on mount via Framer Motion (`initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}`, ≤400ms), with a short stagger (`staggerChildren: 0.05`) across heading → fields → button using Framer Motion's `variants` on a wrapping `motion.div`. `useReducedMotion()` (from `framer-motion`, already a dependency) disables the transform, keeping only the opacity fade. The branding image itself is not animated.

## Accessibility

- Real `<form>` with `onSubmit`, `<label htmlFor>` for both fields (unchanged pattern from today).
- `aria-invalid` + `aria-describedby` on both fields when their field-level error is present (existing pattern, kept).
- Password toggle: `aria-label="Show password"/"Hide password"` (existing pattern, kept), focus stays on the input after toggling (existing behavior — the button doesn't steal focus since it's not focused programmatically).
- `AuthErrorAlert`: `role="alert"` (implicit `aria-live="assertive"`), same as today's `formError` paragraph, just extracted into its own component with icon/background styling added.
- Back-to-storefront link and Sign In button both keep visible focus rings (`focus-visible:ring-2`).
- Tab order: back-link → email field → password field → visibility toggle → sign in button (natural DOM order, no `tabIndex` overrides needed).

## Testing plan

**Update `LoginPage.test.jsx`** (all 5 existing tests) for the label/copy change:
- `getByLabelText('Username')` → `getByLabelText('Email address')` (2 tests)
- `screen.findByText('Username is required.')` → `'Email address is required.'` (1 test)
- Add one new test: renders already-authenticated (mock `useAuth`/seed `localStorage` before render, or navigate to `/login` with an authenticated `AuthProvider`) and assert immediate redirect to `/admin` — covers the one new behavior.
- No other existing test behavior changes (loading state, redirect-to-originally-requested-page, invalid-credentials error message all stay as-is, just re-pointed at the new label).

**New component tests** are not required beyond what `LoginPage.test.jsx` already exercises through composition — `AdminBrandingPanel`/`AdminLoginCard`/`FormField`/`PasswordField`/`AuthErrorAlert` are presentational and fully covered indirectly (matches how this codebase tests page-level components elsewhere, e.g. `ProductsPage.test.jsx` doesn't separately unit-test `ImportProductsModal`'s internals).

## Final manual verification

1. Run frontend dev server, visually compare `/login` desktop against the reference at 1440px+ width.
2. Confirm no vertical scroll at 1024px+ with a standard viewport height.
3. Confirm the branding image fills only the left ~42% (once the user has placed the file).
4. Confirm Remember Me / Forgot Password are absent and there's no empty gap where they'd have been.
5. Test: empty submit shows both field errors; invalid-credentials shows `AuthErrorAlert`; successful login with `johnrovs`/`admin123` redirects to `/admin`; visiting `/login` while already authenticated redirects immediately; password visibility toggle works and preserves focus.
6. Resize through 1024px and 768px breakpoints, confirm branding panel / compact logo swap and no horizontal overflow.
7. Tab through the entire form with keyboard only, confirm visible focus at every stop in a sensible order.
8. Run `npx vitest run` (frontend) — full suite green except the 5 pre-existing unrelated `DashboardHeader.test.jsx` failures.
9. Run `npm run build` (frontend) to confirm the production build succeeds with the new asset import.
