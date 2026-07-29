# Product Brand & Scheduled Publishing

## Context

The admin Product form (`frontend/src/components/ProductForm.jsx`) currently
has no way to record a product's brand, and publishing is binary — the
"Active" checkbox is either on (live on the public site) or off. This adds:

1. An optional **Brand** field.
2. A **scheduled publishing** option: instead of toggling Active by hand, an
   admin can switch to "Schedule for later," pick a future date/time, and the
   product goes live automatically at that moment via a new backend job.

This is a full-stack feature: a DB migration, entity/DTO changes, a new
scheduled job (the backend has no `@Scheduled` jobs today), and frontend form
changes. Three scope-defining decisions were confirmed before this design:

- Scheduling is **automatic** — a real backend job flips the product active
  at the target time, not just a stored reminder date.
- When scheduling is on, it **replaces** the Active checkbox — the product is
  saved inactive and the job activates it; when scheduling is off, Active
  works exactly as it does today.
- Brand is **optional** — no backfill needed for existing products.

## 1. Database & Entity

New migration `backend/src/main/resources/db/migration/V12__add_product_brand_and_scheduled_publish.sql`:

```sql
ALTER TABLE products
    ADD COLUMN brand VARCHAR(200) NULL,
    ADD COLUMN scheduled_publish_at TIMESTAMP NULL;
```

`Product.java` gains:

```java
@Column(length = 200)
private String brand;

@Column(name = "scheduled_publish_at")
private LocalDateTime scheduledPublishAt;
```

Both nullable — no default, no backfill.

## 2. DTOs & Validation

`ProductRequest` gains two fields, inserted after `productLink` and before
the existing `trending`/`bestSeller`/`active` flags:

```java
@Size(max = 200, message = "Brand must be at most 200 characters.")
String brand,

@Future(message = "Scheduled publish date must be in the future.")
LocalDateTime scheduledPublishAt,
```

Neither is `@NotNull`/`@NotBlank` — both optional. `@Future` on a nullable
field only validates when a value is present (Jakarta Validation semantics),
so it's a no-op when scheduling isn't used.

`ProductResponse` gains matching `String brand` and
`LocalDateTime scheduledPublishAt` fields, mapped in `ProductMapper.toResponse`
the same way every other field is.

## 3. Save Behavior

In `ProductServiceImpl.create` and `.update`, the effective `active` value is
computed rather than passed straight through, as a safety net matching "schedule
replaces Active" even if a client ever sent inconsistent data:

```java
boolean effectiveActive = request.scheduledPublishAt() != null ? false : request.active();
```

This replaces the direct `.active(request.active())` / `product.setActive(request.active())`
calls in both methods. `brand` and `scheduledPublishAt` are set straight from
the request like every other field.

## 4. Automatic Publishing Job

New `backend/src/main/java/com/twogofindz/backend/scheduler/ProductPublishScheduler.java`:

```java
@Component
public class ProductPublishScheduler {

    private final ProductRepository productRepository;

    public ProductPublishScheduler(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void publishScheduledProducts() {
        List<Product> due = productRepository
                .findByActiveFalseAndScheduledPublishAtLessThanEqual(LocalDateTime.now());
        due.forEach(product -> {
            product.setActive(true);
            product.setScheduledPublishAt(null);
        });
        productRepository.saveAll(due);
    }
}
```

`ProductRepository` gains:

```java
List<Product> findByActiveFalseAndScheduledPublishAtLessThanEqual(LocalDateTime now);
```

Runs every 60 seconds — matches the minute-level precision of a
`datetime-local` picker; no need for finer granularity. `BackendApplication`
gains `@EnableScheduling` (no scheduled jobs exist anywhere in the codebase
today, so this is new but minimal — one annotation, one new class).

`scheduledPublishAt` is cleared to `null` once a product goes live, since a
non-null value's only meaning is "still pending."

## 5. Product Form (Frontend)

`ProductForm.jsx` changes:

- **Brand field**: new optional text input, placed directly after Product
  Name, styled identically to the other text fields (label
  `text-small font-medium text-body`, input `border-border rounded-btn
  focus:border-primary`).
- **Schedule switch**: replaces the plain Active checkbox with a bordered row
  containing a label ("Schedule for later"), a one-line description
  ("Automatically publish this product at a future date and time."), and a
  switch control — a hand-built `<button role="switch" aria-checked>` (the
  same "no external UI library" approach every other custom control in this
  app uses, e.g. `Modal`, `ConfirmDialog`), styled as a pill that slides
  between `bg-slate-300` (off) and `bg-primary` (on).
- **Conditional rendering**:
  - Switch **off** (default): the Active checkbox renders exactly as it does
    today, unchanged behavior.
  - Switch **on**: the Active checkbox is hidden; a `datetime-local` input
    ("Publish Date & Time") appears below the switch row, required in this
    mode.
- **Edit mode pre-fill**: if the loaded `product.scheduledPublishAt` is
  non-null, the switch initializes to "on" and the datetime input pre-fills
  with that value.
- **Client-side validation**: when the switch is on, submitting without a
  chosen date/time shows "Scheduled date is required."; choosing a date/time
  that isn't strictly in the future shows "Scheduled date must be in the
  future." — mirroring the backend's `@Future` check so the error surfaces
  before a round-trip.
- **Submit payload**: `brand: brand.trim() || null`;
  `scheduledPublishAt: isScheduled ? new Date(scheduledPublishAtInput).toISOString() : null`;
  `active: isScheduled ? false : active`.

No changes to `ProductFormPage.jsx` beyond what it already passes through
(`product`, `onSubmit`, `onCancel`).

## 6. Admin Product List (`ProductsPage.jsx`)

- New **Brand** column between Category and Price, rendering `row.brand ?? '—'`.
- Status column gains a **Scheduled** badge — `bg-info/10 text-info` (the
  `info` token exists in the design system but has no consumer yet) — shown
  whenever `row.scheduledPublishAt` is non-null, alongside the existing
  Trending/Best Seller/Inactive badges (a product can be both "Scheduled" and
  "Inactive" simultaneously while pending).

## Out of Scope

- No changes to the public catalog, search, or comparison endpoints — `active`
  keeps its exact current meaning everywhere else in the app.
- No bulk-scheduling, no editing/canceling a schedule from the list page
  (only from the edit form) — matches how every other product field is
  already only editable via the form.
- No timezone selector — `datetime-local` uses the browser's local time, and
  the backend compares against server local time via `LocalDateTime.now()`,
  consistent with how the rest of this codebase handles timestamps (no
  existing timezone-aware handling anywhere).
- No backfill of `brand` for existing products.

## Testing

- Backend: `ProductServiceImplTest` (or equivalent) gains cases for
  create/update with `scheduledPublishAt` set (asserts `active` is forced
  false) and without. A new `ProductPublishSchedulerTest` covers: a due
  product gets activated and its `scheduledPublishAt` cleared; a not-yet-due
  product is left untouched.
- Frontend: `ProductForm.test.jsx` gains cases for the brand field, the
  switch's show/hide behavior for the Active checkbox and datetime input, the
  two new client-side validation errors, and the submit payload shape in both
  modes. `ProductsPage.test.jsx` gains a case asserting the Scheduled badge
  renders when applicable.
