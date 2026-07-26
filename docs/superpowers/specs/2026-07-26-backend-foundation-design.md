# Stage 1: Foundation + Backend Core — Design

**Date:** 2026-07-26
**Scope:** First implementation stage of the 2Go Findz platform. Establishes the repo layout, the MySQL schema for `users`, `product_categories`, and `products`, and the Spring Boot backend covering authentication and category/product CRUD.

**Master spec:** `docs/PROJECT_SPEC.md`. This document scopes down that spec to what's built in this stage; everything not mentioned here (image upload endpoint, view/click tracking, system settings, dashboard analytics, frontend) is explicitly deferred to later stages.

## Out of scope for this stage

- `system_settings`, `website_views`, `product_clicks` tables and their endpoints
- The actual file-upload endpoint / `StorageService` (the `products.image_file_name` column exists as a plain string now, but nothing writes to disk yet)
- Dashboard analytics / commission calculation endpoints
- Any frontend code

## Repo layout

```
2go-findz/
├── frontend/                    (created empty this stage; populated in a later stage)
└── backend/
    ├── pom.xml
    ├── src/main/java/com/twogofindz/backend/
    │   ├── BackendApplication.java
    │   ├── config/               SecurityConfig, CorsConfig
    │   ├── security/              JwtTokenProvider, JwtAuthFilter, UserDetailsServiceImpl, SecurityUser
    │   ├── controller/            AuthController, admin/ProductController, admin/CategoryController,
    │   │                          public/PublicProductController, public/PublicCategoryController
    │   ├── service/  +  service/impl/
    │   ├── repository/            UserRepository, ProductRepository, ProductCategoryRepository
    │   ├── entity/                User, Product, ProductCategory
    │   ├── dto/request/           LoginRequest, ProductRequest, CategoryRequest
    │   ├── dto/response/          ApiResponse<T>, LoginResponse, ProductResponse, CategoryResponse
    │   ├── mapper/                ProductMapper, CategoryMapper (manual mapping, no MapStruct)
    │   ├── exception/             GlobalExceptionHandler + custom exceptions
    │   └── util/
    ├── src/main/resources/
    │   ├── application.yml (+ dev/prod profiles)
    │   └── db/migration/          V1__create_users_table.sql
    │                               V2__create_product_categories_table.sql
    │                               V3__create_products_table.sql
    │                               V4__seed_admin_user.sql
    └── src/test/java/...          mirrors main package structure
```

## Database schema (Flyway-managed)

Chosen over Hibernate `ddl-auto`: versioned, reviewable SQL migrations are reproducible across dev/CI/prod and match the spec's requirement for a real MySQL creation script deliverable.

**users**
- `id` PK, `full_name`, `username` (unique), `password_hash` (BCrypt), `role` (default `ADMIN`), `active`, `created_at`, `updated_at`

**product_categories**
- `id` PK, `product_category_name` (unique), `commission_rate` `DECIMAL(5,2)` constrained 0.00–100.00, `created_at`, `updated_at`

**products**
- `id` PK, `name`, `description`, `product_category_id` FK → `product_categories.id` (`ON DELETE RESTRICT` as a DB-level backstop), `image_file_name` (nullable string), `product_price` `DECIMAL(10,2)`, `product_link` (HTTPS only, validated at the DTO layer), `is_trending`, `is_best_seller`, `active`, `created_at`, `updated_at`
- Indexes: `name`, `product_category_id`, `created_at`, `is_trending`, `is_best_seller`

**Seed data (V4):** admin user `id=1`, `full_name='John Rommel Rovero'`, `username='johnrovs'`, `password_hash` = precomputed BCrypt hash of `admin123`, `role='ADMIN'`, `active=true`. Migration file carries a comment recommending the password be changed immediately after first login. The plain-text password never appears anywhere except this one-time instruction.

## Security architecture

- **Password hashing:** BCrypt via Spring Security's `BCryptPasswordEncoder`.
- **JWT:** Stateless, HS256, secret from `JWT_SECRET` env var, ~24h expiry, no refresh token (matches spec — frontend re-prompts login on expiry rather than silently refreshing).
- **Filter chain:** `JwtAuthFilter` (a `OncePerRequestFilter`) extracts the `Bearer` token, validates it, and populates `SecurityContext` via `UserDetailsServiceImpl`.
- **Authorization:** `/api/auth/**` and `/api/public/**` are permit-all; `/api/admin/**` requires `ROLE_ADMIN`.
- **Error responses:** Custom `AuthenticationEntryPoint` (401) and `AccessDeniedHandler` (403) return the standard `ApiResponse` JSON envelope — never Spring Security's default HTML error page.
- **CORS:** Origin restricted to the `FRONTEND_URL` env var; no wildcard origins.
- **CSRF:** Disabled (stateless token-based API, no cookies).

## API surface (this stage only)

```
POST   /api/auth/login

GET    /api/admin/products
POST   /api/admin/products
PUT    /api/admin/products/{id}
DELETE /api/admin/products/{id}

GET    /api/admin/categories
POST   /api/admin/categories
PUT    /api/admin/categories/{id}
DELETE /api/admin/categories/{id}

GET    /api/public/products        (search/filter/sort/pagination via JPA Specifications)
GET    /api/public/products/{id}
GET    /api/public/categories
```

All responses use the standard envelope:
```json
{ "success": true, "message": "...", "data": {}, "timestamp": "2026-07-26T17:25:30" }
```

## Error handling

`@RestControllerAdvice`-based `GlobalExceptionHandler` maps:
- Bean Validation failures → 400 with a field-level `errors` map
- `ResourceNotFoundException` → 404
- `DuplicateResourceException` (duplicate category name) → 409
- Category deletion with assigned products → 409 with a helpful message (checked in the service layer, ahead of the DB constraint)
- Bad credentials → 401 with a generic "invalid username or password" message (no user-enumeration hints)
- Access denied → 403
- Any uncaught exception → 500, no stack trace or internal detail ever serialized to the client

## Testing

JUnit 5 + Mockito + MockMvc + Spring Boot Test, run against **Testcontainers MySQL** (not H2) so tests exercise real MySQL semantics — consistent with the project's production-readiness bar and avoids dialect mismatches (e.g. `DECIMAL` handling, collation).

Coverage for this stage:
- Login: success, bad credentials, validation errors
- Product CRUD: create/update/delete/list, validation (price ≥ 0, HTTPS link, required fields), 404 on missing product
- Category CRUD: create/update/delete/list, duplicate name rejection, delete-blocked-by-assigned-products, commission rate range validation
- Authorization: `/api/admin/**` rejected without a valid ADMIN token; `/api/public/**` reachable without auth

## Environment variables (backend `.env.example`)

```
DB_URL=jdbc:mysql://localhost:3306/two_go_findz
DB_USERNAME=root
DB_PASSWORD=your_password
JWT_SECRET=replace_with_a_long_secure_secret
FRONTEND_URL=http://localhost:5173
UPLOAD_DIRECTORY=uploads
```

(`UPLOAD_DIRECTORY` is reserved for the next stage but declared now so the env contract is stable.)
