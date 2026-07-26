Act as a senior full-stack software developer, UI/UX designer, database architect, and security engineer.

Create a complete, production-ready Amazon affiliate marketing website named **“2Go Findz”** using the following technology stack:

## Technology Stack

### Frontend

* React JS
* Vite
* Tailwind CSS
* Framer Motion
* React Router DOM
* Axios
* Recharts or Chart.js for dashboard analytics
* Lucide React for icons

### Backend

* Java 21
* Spring Boot
* Spring Web
* Spring Data JPA
* Spring Security
* JWT authentication
* Bean Validation
* Lombok
* Maven

### Database

* MySQL

Build the application with clean architecture, reusable components, responsive layouts, secure authentication, REST APIs, proper validation, error handling, and maintainable code.

The frontend and backend must be separate projects:

```text
2go-findz/
├── frontend/
└── backend/
```

# General Design Requirements

Create a clean, modern, premium, and visually engaging affiliate marketing website.

The design should:

* Use large, bold typography.
* Have an eye-catching hero section.
* Include clear calls to action.
* Use smooth Framer Motion animations.
* Use scroll-triggered animations.
* Be fully responsive on mobile, tablet, laptop, and desktop.
* Work properly across modern browsers.
* Use consistent spacing, typography, buttons, cards, and colors.
* Avoid cluttered layouts.
* Use an aesthetic suitable for Amazon product recommendations.
* Include loading states, empty states, error states, confirmation dialogs, and success notifications.
* Follow accessibility best practices.
* Include meaningful alt text for images.
* Include visible keyboard focus states.
* Use semantic HTML.

Use a modern color palette suitable for the “2Go Findz” brand. The website should feel energetic, trustworthy, modern, and shopping-focused.

# User Roles

Create one administrator role:

```text
ADMIN
```

Only authenticated administrators may access the dashboard and management pages.

Public visitors may access the homepage and view affiliate products without logging in.

# Frontend Requirements

## 1. Public Home Page

Create a public homepage for the “2Go Findz” affiliate shop.

### Hero Banner

Display a large hero banner at the top of the page.

Include:

* Shop name: “2Go Findz”
* A short, engaging bio describing the shop
* Large, bold, eye-catching headline
* Supporting description
* Primary call-to-action button
* Secondary call-to-action button
* Attractive background image, gradient, or product-inspired visual
* Smooth entrance animations using Framer Motion

Suggested headline:

```text
Smart Finds. Better Buys. All in One Place.
```

Suggested shop bio:

```text
Discover trending Amazon products, everyday essentials, affordable finds, and must-have items carefully selected to help you shop smarter.
```

Suggested buttons:

```text
Explore Products
View Trending Finds
```

### Social Media Links

Below the hero banner, display social media links for:

* TikTok
* Pinterest
* Instagram
* YouTube

Each social link must include:

* Platform icon
* Platform name
* Hover animation
* External link behavior
* `target="_blank"`
* `rel="noopener noreferrer"`

Store social media URLs in the system settings or frontend environment configuration so they can be changed easily.

### Product Search and Filters

Create a real-time product search feature.

The search must update product results while the user types without requiring a page refresh.

Allow users to search by:

* Product name
* Product description
* Product category

Add filters for:

* All Products
* Trending
* Best Sellers
* Product Category

Add sorting options for:

* Newest Added
* Oldest Added
* Price: Low to High
* Price: High to Low
* Product Name: A–Z
* Product Name: Z–A

By default, display products by date added in ascending order, from oldest to newest.

Implement pagination or infinite scrolling when the product list becomes large.

### Product Cards

Display products using responsive product cards.

Each product card must show:

* Product image
* Product name
* Product category
* Product description
* Product price
* Commission rate, visible only in the dashboard
* Trending badge when applicable
* Best Seller badge when applicable
* Date added
* “View on Amazon” button

The “View on Amazon” button must:

* Open the affiliate product link in a new tab
* Track the product click through the backend before redirecting
* Use `rel="nofollow sponsored noopener noreferrer"`

Create hover animations for product images, cards, and buttons.

Use lazy loading for product images.

### Public Site View Tracking

Track public homepage visits through the Spring Boot backend.

Requirements:

* Record a website view when a visitor opens the homepage.
* Avoid counting repeated requests caused by React re-rendering.
* Record useful information such as timestamp and optional anonymous session identifier.
* Do not store unnecessary personal information.
* Provide an API endpoint that the frontend can call once per session.
* Display the total website view count in the admin dashboard.

### Additional Homepage Sections

Include:

* Featured Products
* Trending Finds
* Best Sellers
* Shop by Category
* Why Shop with 2Go Findz
* Social Media call-to-action
* Footer with affiliate disclosure

Add the following affiliate disclosure:

```text
As an Amazon Associate, 2Go Findz may earn from qualifying purchases. Product prices and availability may change at any time.
```

# 2. Login Page

Create a dedicated administrator login page.

The form must contain only:

* Username
* Password
* Login button

Include:

* Form validation
* Show or hide password button
* Loading state
* Invalid credentials message
* Secure JWT authentication
* Redirect to the dashboard after successful login
* Redirect unauthenticated users to the login page
* Logout functionality
* Token expiration handling

Do not display public registration or forgot-password forms unless they are added in the future.

Do not store plain-text passwords or use MD5.

Use BCrypt password hashing.

Seed the following default administrator account:

```text
Full name: John Rommel Rovero
Username: johnrovs
Initial password: admin123
Role: ADMIN
```

The initial password must be hashed with BCrypt before it is stored in MySQL.

Add a clear backend comment recommending that the administrator change the default password immediately after the first login.

Never expose the password in API responses, console logs, frontend code, or GitHub files.

# 3. Administrator Dashboard

Create a protected dashboard that is accessible only after authentication.

Use a responsive dashboard layout with:

* Sidebar navigation
* Top navigation bar
* Mobile sidebar drawer
* Administrator profile area
* Logout button
* Breadcrumbs
* Page titles
* Loading states

Dashboard menu items:

```text
Dashboard
Products
Product Categories
System Settings
Logout
```

## Dashboard Analytics

Display analytics cards for:

* Total homepage views
* Total product clicks
* Estimated total product commission
* Total products added
* Total product categories
* Trending products count
* Best seller products count

Create charts for:

* Website views by day
* Product clicks by day
* Most-clicked products
* Estimated commission by category
* Products added by month

Allow dashboard analytics to be filtered by:

* Today
* Last 7 Days
* Last 30 Days
* Current Month
* Custom date range

### Commission Calculation

Calculate estimated product commission using:

```text
Estimated Commission =
Product Price × Product Category Commission Rate × Number of Tracked Product Clicks
```

Clearly label this as an estimate because actual Amazon affiliate earnings depend on confirmed qualifying purchases, not clicks alone.

Store commission rates as percentages.

Example:

```text
Product Price: $100.00
Commission Rate: 4%
Estimated commission per qualifying purchase: $4.00
```

Do not represent click-based estimates as confirmed income.

# 4. Product Management

Create a protected product management page with complete CRUD functionality.

Administrators must be able to:

* Create a product
* View products
* Update a product
* Delete a product
* Search products
* Filter products
* Sort products
* Preview uploaded images
* Mark products as trending
* Mark products as best sellers
* Activate or deactivate products

### Product Form Fields

Include:

* Product image upload
* Product name
* Product category
* Product description
* Product price
* Amazon affiliate product link
* Trending checkbox
* Best Seller checkbox
* Active status checkbox

### Product Image Upload

Allow common image formats:

* JPG
* JPEG
* PNG
* WebP

Validate:

* File type
* Maximum file size
* Empty files
* Unsafe filenames

Generate a unique filename using this format:

```text
img_yyyyMMdd_timestamp_sequence.extension
```

Example:

```text
img_20260725_172530_001.webp
```

Do not trust the original uploaded filename.

Store the generated filename in the database.

Store the image in a configurable server upload directory.

Expose uploaded images through a secure static-resource endpoint.

Provide a default placeholder image when a product image is missing.

### Delete Behavior

Before deleting a product:

* Show a confirmation dialog.
* Explain that the action cannot be undone.
* Delete or safely archive the associated image.
* Prevent broken image references.

Prefer soft deletion using an `active` field when preserving historical analytics is important.

# 5. Product Category Management

Create a protected product category management page with complete CRUD functionality.

Administrators must be able to:

* Create a category
* View categories
* Update a category
* Delete a category
* Search categories
* Sort categories

### Product Category Form Fields

Include:

* Product category name
* Commission rate

Commission rate requirements:

* Use a decimal type.
* Accept percentage values.
* Validate that the rate is between 0 and 100.
* Display a percentage symbol in the frontend.
* Prevent duplicate category names.

Before deleting a category, check whether products are assigned to it.

If products are assigned, prevent deletion and show a helpful validation message.

# 6. System Settings

Create a protected system settings page.

Allow the administrator to manage:

* Website logo
* Hero banner image
* Default product placeholder image
* TikTok URL
* Pinterest URL
* Instagram URL
* YouTube URL
* Shop bio
* Hero headline
* Hero description
* Affiliate disclosure
* Contact email

Store uploaded system images using the same secure image-upload strategy used for products.

# Backend Requirements

Create RESTful APIs using Spring Boot.

Use a layered architecture:

```text
controller
service
service.impl
repository
entity
dto
mapper
security
config
exception
util
```

Do not expose JPA entities directly from controllers.

Use request and response DTOs.

Use service interfaces and implementations.

Use centralized exception handling with `@RestControllerAdvice`.

Use proper HTTP status codes.

Create consistent API responses.

Suggested response structure:

```json
{
  "success": true,
  "message": "Product created successfully.",
  "data": {},
  "timestamp": "2026-07-25T17:25:30"
}
```

For validation errors:

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {
    "name": "Product name is required."
  },
  "timestamp": "2026-07-25T17:25:30"
}
```

# Authentication and Security

Implement:

* Spring Security
* JWT access tokens
* BCrypt password hashing
* Role-based authorization
* Protected dashboard APIs
* Public product APIs
* Secure CORS configuration
* Request validation
* File-upload validation
* Authentication exception handling
* Authorization exception handling

Public endpoints may include:

```text
POST /api/auth/login
GET /api/public/products
GET /api/public/products/{id}
GET /api/public/categories
GET /api/public/settings
POST /api/public/views
POST /api/public/products/{id}/click
```

Protected administrator endpoints must use:

```text
/api/admin/**
```

Examples:

```text
GET    /api/admin/dashboard/summary
GET    /api/admin/dashboard/analytics
GET    /api/admin/products
POST   /api/admin/products
PUT    /api/admin/products/{id}
DELETE /api/admin/products/{id}

GET    /api/admin/categories
POST   /api/admin/categories
PUT    /api/admin/categories/{id}
DELETE /api/admin/categories/{id}

GET    /api/admin/settings
PUT    /api/admin/settings
```

Configure CORS using an environment variable for the permitted frontend URL.

Do not allow unrestricted origins in production.

# MySQL Database Design

Use normalized relational tables with foreign keys, indexes, constraints, and timestamps.

## Table: users

```text
id
full_name
username
password_hash
role
active
created_at
updated_at
```

Requirements:

* `id` must be the primary key.
* `username` must be unique.
* Store the BCrypt password hash in `password_hash`.
* Do not use MD5.
* Do not store plain-text passwords.
* Default role is `ADMIN`.
* Seed the default administrator securely.

Default administrator data:

```text
id: 1
full_name: John Rommel Rovero
username: johnrovs
initial password: admin123
role: ADMIN
active: true
```

## Table: product_categories

```text
id
product_category_name
commission_rate
created_at
updated_at
```

Requirements:

* Category name must be unique.
* Use `DECIMAL(5,2)` for the commission percentage.
* Add validation from 0.00 to 100.00.

## Table: products

```text
id
name
description
product_category_id
image_file_name
product_price
product_link
is_trending
is_best_seller
active
created_at
updated_at
```

Requirements:

* Use a foreign key from `product_category_id` to `product_categories.id`.
* Use `DECIMAL(10,2)` or an appropriate decimal size for `product_price`.
* Do not use floating-point types for money.
* Add indexes for name, category, created date, trending status, and best-seller status.
* Validate that the product link uses HTTPS.
* Sanitize and validate affiliate URLs.
* Store only the generated image filename, not binary image data.

## Table: system_settings

```text
id
setting_key
setting_value
image_path
created_at
updated_at
```

Alternatively, create clearly named columns for each setting when preferred.

Support settings for:

* Logo image
* Hero image
* Placeholder image
* Social media links
* Shop bio
* Hero content
* Affiliate disclosure
* Contact email

## Table: website_views

```text
id
anonymous_session_id
viewed_at
```

Do not store unnecessary personal visitor data.

Add an index to `viewed_at`.

## Table: product_clicks

```text
id
product_id
anonymous_session_id
clicked_at
```

Requirements:

* Add a foreign key to `products.id`.
* Add indexes for `product_id` and `clicked_at`.
* Use this table for click analytics and estimated commission calculations.

# Search, Filtering, Sorting, and Pagination

Implement backend-based search, filtering, sorting, and pagination.

Example request:

```text
GET /api/public/products?page=0&size=12&search=headphones&categoryId=1&trending=true&sort=createdAt,asc
```

Support:

* Search term
* Category ID
* Trending status
* Best Seller status
* Active status
* Minimum price
* Maximum price
* Date sorting
* Price sorting
* Name sorting

Use Spring Data JPA specifications or a clean dynamic-query approach.

# Frontend State and API Integration

Create a centralized Axios configuration.

Include:

* Backend base URL from environment variables
* JWT authorization header
* Request interceptor
* Response interceptor
* Automatic handling of expired or invalid tokens
* Consistent API error handling

Use environment variables:

Frontend:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

Backend:

```env
DB_URL=jdbc:mysql://localhost:3306/two_go_findz
DB_USERNAME=root
DB_PASSWORD=your_password
JWT_SECRET=replace_with_a_long_secure_secret
FRONTEND_URL=http://localhost:5173
UPLOAD_DIRECTORY=uploads
```

Do not commit `.env` files, passwords, JWT secrets, or production credentials to GitHub.

Provide `.env.example` files.

# React Routes

Create routes similar to:

```text
/                       Public homepage
/login                  Administrator login
/admin                  Dashboard overview
/admin/products         Product management
/admin/products/new     Add product
/admin/products/:id     Edit product
/admin/categories       Category management
/admin/settings         System settings
```

Create protected routes for all `/admin` pages.

# Reusable Frontend Components

Create reusable components such as:

```text
Navbar
HeroSection
SocialLinks
ProductSearch
ProductFilters
ProductGrid
ProductCard
CategoryCard
SectionHeading
Footer
AffiliateDisclosure
ProtectedRoute
AdminSidebar
AdminTopbar
AnalyticsCard
AnalyticsChart
DataTable
Pagination
SearchInput
FilterDropdown
ProductForm
CategoryForm
ImageUploader
ConfirmDialog
LoadingSpinner
SkeletonCard
EmptyState
ErrorState
ToastNotification
```

# Validation Requirements

Validate data on both the frontend and backend.

Product validation:

* Product name is required.
* Category is required.
* Description is required.
* Price must be greater than or equal to zero.
* Product URL is required and must be valid HTTPS.
* Image type and size must be validated.

Category validation:

* Category name is required.
* Category name must be unique.
* Commission rate must be between 0 and 100.

Login validation:

* Username is required.
* Password is required.
* Generic error messages must be used for invalid credentials.

# Error Handling

Handle:

* Invalid login
* Expired JWT
* Unauthorized access
* Forbidden access
* Product not found
* Category not found
* Duplicate category
* Invalid product URL
* Invalid file upload
* File storage failure
* Database errors
* Network errors
* Empty product results

Do not expose stack traces, passwords, database details, or sensitive server information to users.

# Testing

Create backend tests using:

* JUnit 5
* Mockito
* Spring Boot Test
* MockMvc

Test:

* Authentication
* Product CRUD
* Category CRUD
* Authorization
* Validation
* Product search
* Website view tracking
* Product click tracking
* Commission calculations

Create frontend tests where practical using:

* Vitest
* React Testing Library

Test:

* Login form
* Protected routes
* Product search
* Product filters
* Product cards
* Product forms
* API error handling

# Deployment Preparation

Prepare the project for deployment using:

* Netlify or Vercel for React
* Render for Spring Boot
* Aiven MySQL or another managed MySQL provider

Include:

* Production environment variables
* CORS configuration
* Build commands
* Deployment instructions
* Database setup instructions
* Image storage warning

Explain that local server file uploads may not persist on some free hosting platforms. Structure the storage service so local uploads can later be replaced with Cloudinary, Amazon S3, or another persistent object-storage provider.

# Documentation

Create a complete `README.md` containing:

* Project description
* Technology stack
* Features
* Folder structure
* Prerequisites
* MySQL database setup
* Backend installation
* Frontend installation
* Environment variables
* How to run locally
* Default administrator login
* Security warning to change the default password
* API endpoint summary
* Image upload configuration
* Deployment guide
* Troubleshooting guide

# Coding Standards

Follow these rules:

* Use clean and descriptive naming.
* Avoid duplicated code.
* Use reusable components and services.
* Keep controllers thin.
* Put business logic in services.
* Use DTOs instead of returning entities.
* Use database transactions where appropriate.
* Use `BigDecimal` for prices and commission calculations.
* Use `LocalDateTime` or `Instant` for timestamps.
* Use Java records for DTOs where appropriate.
* Add comments only when they explain important decisions.
* Do not generate placeholder code that does not work.
* Do not leave incomplete TODO sections.
* Do not use deprecated libraries or insecure authentication methods.
* Do not use MD5 for passwords.
* Do not hard-code credentials.
* Ensure imports and dependencies are complete.
* Ensure the project compiles and runs.

# Expected Output

Generate the project in organized stages.

## Stage 1

Provide:

* Complete folder structure
* Database schema
* Entity relationships
* API endpoint plan
* Security architecture
* Frontend page structure

## Stage 2

Generate the complete Spring Boot backend:

* `pom.xml`
* Configuration
* Entities
* Repositories
* DTOs
* Services
* Controllers
* JWT authentication
* Spring Security
* Exception handling
* File upload handling
* Seed data
* Tests

## Stage 3

Generate the complete React frontend:

* `package.json`
* Vite configuration
* Tailwind configuration
* Routing
* Authentication
* Public homepage
* Product search and filters
* Product cards
* Login page
* Admin dashboard
* Product CRUD
* Category CRUD
* System settings
* Charts
* Animations
* Responsive design
* API integration

## Stage 4

Provide:

* MySQL creation script
* Sample data
* `.env.example` files
* Local setup instructions
* Deployment instructions
* Testing instructions
* Final README

Before generating each stage, verify that the code is consistent with all previously generated files.

When modifying a file, always provide the complete updated file rather than an incomplete fragment.

The final application must be functional, secure, responsive, visually polished, and ready for local development and deployment.
