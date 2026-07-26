# Backend Foundation (Stage 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `backend/` Spring Boot project with a Flyway-managed MySQL schema, JWT authentication, and full CRUD for products and product categories — the load-bearing base for every later stage (image upload, analytics, frontend).

**Architecture:** Single-module Maven project (`com.twogofindz.backend`), layered `controller → service → service.impl → repository → entity`, DTOs only at the controller boundary, Flyway-versioned schema, stateless JWT auth via Spring Security. Full rationale in `docs/superpowers/specs/2026-07-26-backend-foundation-design.md`.

**Tech Stack:** Java 21, Spring Boot 3.2.5 (Web, Data JPA, Security, Validation), MySQL 8, Flyway, Lombok, jjwt 0.12.5, JUnit 5 + Mockito + MockMvc + Testcontainers (`mysql:8.0`).

## Global Constraints

- Java 21 / Spring Boot 3.2.5 / Maven — no other build tool.
- Package base `com.twogofindz.backend`. **Deviation from the spec's literal folder name:** `public` is a reserved Java keyword and cannot be a package segment, so the public-facing controllers live in `com.twogofindz.backend.controller.publicapi` — URL paths remain exactly `/api/public/**` as specified.
- **Deviation from the design doc's migration order:** the design doc lists `V4__seed_admin_user.sql` last; this plan seeds the admin user in `V2` (right after the `users` table, before `product_categories`/`products`) so Task 2 is independently testable without waiting on later tasks. Same four migrations, same content, reordered for buildability.
- Schema is Flyway-managed only. Never set `spring.jpa.hibernate.ddl-auto` to anything but `validate`.
- `BigDecimal` for every money/commission value — never `float`/`double`. `DECIMAL(10,2)` for prices, `DECIMAL(5,2)` for commission rates.
- `LocalDateTime` for all timestamps. `created_at`/`updated_at` are DB-managed (`DEFAULT CURRENT_TIMESTAMP` / `ON UPDATE CURRENT_TIMESTAMP`); entity fields are `insertable = false, updatable = false`.
- Every product price must validate `>= 0`; every product link must validate as `https://` only.
- `/api/auth/**` and `/api/public/**` are permit-all; `/api/admin/**` requires `ROLE_ADMIN` via JWT. No endpoint returns Spring's default HTML error page — always the JSON envelope.
- Every API response is `ApiResponse<T>` (`success, message, data, timestamp`) or `ValidationErrorResponse` (`success, message, errors, timestamp`). Never return an entity or a raw exception message.
- Commission rate must never appear in any public-facing response — only in the admin `CategoryResponse`. Public category reads use a separate `PublicCategoryResponse` with no commission field.
- Tests run against **Testcontainers MySQL** (`mysql:8.0`), never H2 — real MySQL semantics (DECIMAL handling, collation, CHECK constraints).
- Seeded admin: username `johnrovs`, password `admin123` (BCrypt hash `$2b$10$tM2h7DKPfVcUWE19PFgg/O5xAG5i5RPvROYskHOR922jpPK2bXeY.`, verified against `admin123` before being written into this plan). The plain-text password appears only in this one seed migration's comment and in test fixtures — never logged, never in an API response.
- Never commit `.env`; only `.env.example`.

---

### Task 1: Backend project scaffolding + Testcontainers test base

**Files:**
- Create: `backend/pom.xml`
- Create: `backend/src/main/java/com/twogofindz/backend/BackendApplication.java`
- Create: `backend/src/main/resources/application.yml`
- Create: `backend/src/main/resources/application-dev.yml`
- Create: `backend/src/main/resources/application-prod.yml`
- Create: `backend/.env.example`
- Create: `backend/src/test/java/com/twogofindz/backend/AbstractIntegrationTest.java`
- Test: `backend/src/test/java/com/twogofindz/backend/BackendApplicationTests.java`
- Create: `frontend/.gitkeep` (placeholder so the sibling `frontend/` directory exists for later stages)

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `AbstractIntegrationTest` — every later test class extends this to get a shared, JVM-singleton Testcontainers MySQL instance wired into the Spring context via `@DynamicPropertySource`. Config properties every later task reads: `app.jwt.secret`, `app.jwt.expiration-ms`, `app.cors.allowed-origin`, `app.upload.directory`.

**Prerequisite:** Docker must be running locally — Testcontainers needs it to start the MySQL container.

- [ ] **Step 1: Create `backend/pom.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.5</version>
    <relativePath/>
  </parent>

  <groupId>com.twogofindz</groupId>
  <artifactId>backend</artifactId>
  <version>0.1.0</version>
  <name>backend</name>
  <description>2Go Findz backend API</description>

  <properties>
    <java.version>21</java.version>
    <jjwt.version>0.12.5</jjwt.version>
    <testcontainers.version>1.19.7</testcontainers.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <dependency>
      <groupId>com.mysql</groupId>
      <artifactId>mysql-connector-j</artifactId>
      <scope>runtime</scope>
    </dependency>

    <dependency>
      <groupId>org.flywaydb</groupId>
      <artifactId>flyway-core</artifactId>
    </dependency>
    <dependency>
      <groupId>org.flywaydb</groupId>
      <artifactId>flyway-mysql</artifactId>
    </dependency>

    <dependency>
      <groupId>org.projectlombok</groupId>
      <artifactId>lombok</artifactId>
      <optional>true</optional>
    </dependency>

    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-api</artifactId>
      <version>${jjwt.version}</version>
    </dependency>
    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-impl</artifactId>
      <version>${jjwt.version}</version>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>io.jsonwebtoken</groupId>
      <artifactId>jjwt-jackson</artifactId>
      <version>${jjwt.version}</version>
      <scope>runtime</scope>
    </dependency>

    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.springframework.security</groupId>
      <artifactId>spring-security-test</artifactId>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.testcontainers</groupId>
      <artifactId>junit-jupiter</artifactId>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.testcontainers</groupId>
      <artifactId>mysql</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <dependencyManagement>
    <dependencies>
      <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>testcontainers-bom</artifactId>
        <version>${testcontainers.version}</version>
        <type>pom</type>
        <scope>import</scope>
      </dependency>
    </dependencies>
  </dependencyManagement>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
        <configuration>
          <excludes>
            <exclude>
              <groupId>org.projectlombok</groupId>
              <artifactId>lombok</artifactId>
            </exclude>
          </excludes>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

- [ ] **Step 2: Create `BackendApplication.java`**

```java
package com.twogofindz.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }
}
```

- [ ] **Step 3: Create `application.yml`**

```yaml
spring:
  application:
    name: backend
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:dev}
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true
    locations: classpath:db/migration

server:
  port: ${PORT:8080}

app:
  jwt:
    secret: ${JWT_SECRET}
    expiration-ms: 86400000
  cors:
    allowed-origin: ${FRONTEND_URL:http://localhost:5173}
  upload:
    directory: ${UPLOAD_DIRECTORY:uploads}
```

- [ ] **Step 4: Create `application-dev.yml` and `application-prod.yml`**

`backend/src/main/resources/application-dev.yml`:
```yaml
logging:
  level:
    com.twogofindz.backend: DEBUG
```

`backend/src/main/resources/application-prod.yml`:
```yaml
logging:
  level:
    com.twogofindz.backend: INFO
    org.hibernate.SQL: WARN
```

- [ ] **Step 5: Create `.env.example`**

```
DB_URL=jdbc:mysql://localhost:3306/two_go_findz
DB_USERNAME=root
DB_PASSWORD=your_password
JWT_SECRET=replace_with_a_long_secure_secret_at_least_32_characters
FRONTEND_URL=http://localhost:5173
UPLOAD_DIRECTORY=uploads
SPRING_PROFILES_ACTIVE=dev
PORT=8080
```

- [ ] **Step 6: Create `frontend/.gitkeep`**

Empty file — reserves the `frontend/` directory for the later frontend stage.

- [ ] **Step 7: Write `AbstractIntegrationTest.java`**

```java
package com.twogofindz.backend;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
public abstract class AbstractIntegrationTest {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0")
            .withDatabaseName("two_go_findz_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("app.jwt.secret", () -> "test-secret-key-for-jwt-signing-in-tests-only-1234567890");
        registry.add("app.jwt.expiration-ms", () -> "86400000");
        registry.add("app.cors.allowed-origin", () -> "http://localhost:5173");
        registry.add("app.upload.directory", () -> "uploads-test");
    }
}
```

- [ ] **Step 8: Write the context-load test**

```java
package com.twogofindz.backend;

import org.junit.jupiter.api.Test;

class BackendApplicationTests extends AbstractIntegrationTest {

    @Test
    void contextLoads() {
    }
}
```

- [ ] **Step 9: Run the test**

Run: `cd backend && mvn test -Dtest=BackendApplicationTests`
Expected: PASS (Docker pulls `mysql:8.0`, container starts, Spring context loads). If Docker isn't running, start it before re-running.

- [ ] **Step 10: Commit**

```bash
git add backend/pom.xml backend/src frontend/.gitkeep
git commit -m "chore: scaffold backend project with Testcontainers test base"
```

---

### Task 2: User entity, `users` table, seed admin

**Files:**
- Create: `backend/src/main/resources/db/migration/V1__create_users_table.sql`
- Create: `backend/src/main/resources/db/migration/V2__seed_admin_user.sql`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/User.java`
- Create: `backend/src/main/java/com/twogofindz/backend/repository/UserRepository.java`
- Test: `backend/src/test/java/com/twogofindz/backend/repository/UserRepositoryTest.java`

**Interfaces:**
- Consumes: `AbstractIntegrationTest` (Task 1)
- Produces: `User` entity (`id, fullName, username, passwordHash, role, active, createdAt, updatedAt`); `UserRepository.findByUsernameAndActiveTrue(String username): Optional<User>` — used by `UserDetailsServiceImpl` in Task 3.

- [ ] **Step 1: Write the failing test**

```java
package com.twogofindz.backend.repository;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class UserRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void seededAdminUserExistsWithHashedPassword() {
        Optional<User> found = userRepository.findByUsernameAndActiveTrue("johnrovs");

        assertThat(found).isPresent();
        User admin = found.get();
        assertThat(admin.getFullName()).isEqualTo("John Rommel Rovero");
        assertThat(admin.getRole()).isEqualTo("ADMIN");
        assertThat(new BCryptPasswordEncoder().matches("admin123", admin.getPasswordHash())).isTrue();
    }

    @Test
    void findByUsernameAndActiveTrue_returnsEmpty_whenUsernameUnknown() {
        assertThat(userRepository.findByUsernameAndActiveTrue("nobody")).isEmpty();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn test -Dtest=UserRepositoryTest`
Expected: FAIL — compilation error (`User`, `UserRepository` don't exist yet).

- [ ] **Step 3: Write the migrations**

`V1__create_users_table.sql`:
```sql
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ADMIN',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_username UNIQUE (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

`V2__seed_admin_user.sql`:
```sql
-- Default administrator seed account.
-- SECURITY: change this password immediately after first login.
-- password_hash below is BCrypt("admin123", cost 10) — verified locally before
-- being committed. Never store, log, or return the plain-text password.
INSERT INTO users (id, full_name, username, password_hash, role, active)
VALUES (
    1,
    'John Rommel Rovero',
    'johnrovs',
    '$2b$10$tM2h7DKPfVcUWE19PFgg/O5xAG5i5RPvROYskHOR922jpPK2bXeY.',
    'ADMIN',
    TRUE
);
```

- [ ] **Step 4: Write the `User` entity**

```java
package com.twogofindz.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "role", nullable = false, length = 20)
    private String role;

    @Column(name = "active", nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false)
    private LocalDateTime updatedAt;
}
```

- [ ] **Step 5: Write the `UserRepository`**

```java
package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsernameAndActiveTrue(String username);
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && mvn test -Dtest=UserRepositoryTest`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/resources/db/migration/V1__create_users_table.sql \
        backend/src/main/resources/db/migration/V2__seed_admin_user.sql \
        backend/src/main/java/com/twogofindz/backend/entity/User.java \
        backend/src/main/java/com/twogofindz/backend/repository/UserRepository.java \
        backend/src/test/java/com/twogofindz/backend/repository/UserRepositoryTest.java
git commit -m "feat: add users table, User entity, and seeded admin account"
```

---

### Task 3: Response envelope, exception handling, JWT security core, login

**Files:**
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/ApiResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/ValidationErrorResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/exception/ResourceNotFoundException.java`
- Create: `backend/src/main/java/com/twogofindz/backend/exception/DuplicateResourceException.java`
- Create: `backend/src/main/java/com/twogofindz/backend/exception/CategoryInUseException.java`
- Create: `backend/src/main/java/com/twogofindz/backend/exception/GlobalExceptionHandler.java`
- Create: `backend/src/main/java/com/twogofindz/backend/security/SecurityUser.java`
- Create: `backend/src/main/java/com/twogofindz/backend/security/UserDetailsServiceImpl.java`
- Create: `backend/src/main/java/com/twogofindz/backend/security/JwtTokenProvider.java`
- Create: `backend/src/main/java/com/twogofindz/backend/security/JwtAuthFilter.java`
- Create: `backend/src/main/java/com/twogofindz/backend/security/RestAuthenticationEntryPoint.java`
- Create: `backend/src/main/java/com/twogofindz/backend/security/RestAccessDeniedHandler.java`
- Create: `backend/src/main/java/com/twogofindz/backend/config/SecurityConfig.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/LoginRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/LoginResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/AuthService.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/impl/AuthServiceImpl.java`
- Create: `backend/src/main/java/com/twogofindz/backend/controller/AuthController.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/AuthControllerTest.java`

**Interfaces:**
- Consumes: `User`, `UserRepository` (Task 2), `AbstractIntegrationTest` (Task 1)
- Produces: `ApiResponse<T>` (`success, message, data, timestamp`; statics `success(String,T)`, `success(String)`, `failure(String)`), `ValidationErrorResponse` (`success, message, errors, timestamp`), exceptions `ResourceNotFoundException`/`DuplicateResourceException`/`CategoryInUseException` (all `RuntimeException(String message)`), `JwtTokenProvider.generateToken(String username, String role): String` / `.getUsernameFromToken(String token): String` / `.validateToken(String token): boolean` — every later controller and test relies on these exact types and the `/api/auth/login` endpoint for obtaining a bearer token.

- [ ] **Step 1: Write the failing test**

```java
package com.twogofindz.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.LoginRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class AuthControllerTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void login_succeeds_withSeededAdminCredentials() throws Exception {
        LoginRequest request = new LoginRequest("johnrovs", "admin123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.role").value("ADMIN"));
    }

    @Test
    void login_returns401_withWrongPassword() throws Exception {
        LoginRequest request = new LoginRequest("johnrovs", "wrong-password");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void login_returns400_whenUsernameMissing() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content("{\"password\":\"admin123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.username").exists());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn test -Dtest=AuthControllerTest`
Expected: FAIL — compilation error (none of the classes below exist yet).

- [ ] **Step 3: Write the response envelope**

`ApiResponse.java`:
```java
package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;

public record ApiResponse<T>(
        boolean success,
        String message,
        T data,
        LocalDateTime timestamp
) {
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data, LocalDateTime.now());
    }

    public static ApiResponse<Void> success(String message) {
        return new ApiResponse<>(true, message, null, LocalDateTime.now());
    }

    public static ApiResponse<Void> failure(String message) {
        return new ApiResponse<>(false, message, null, LocalDateTime.now());
    }
}
```

`ValidationErrorResponse.java`:
```java
package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;
import java.util.Map;

public record ValidationErrorResponse(
        boolean success,
        String message,
        Map<String, String> errors,
        LocalDateTime timestamp
) {
    public static ValidationErrorResponse of(Map<String, String> errors) {
        return new ValidationErrorResponse(false, "Validation failed.", errors, LocalDateTime.now());
    }
}
```

- [ ] **Step 4: Write the exception classes**

```java
package com.twogofindz.backend.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
```

```java
package com.twogofindz.backend.exception;

public class DuplicateResourceException extends RuntimeException {
    public DuplicateResourceException(String message) {
        super(message);
    }
}
```

```java
package com.twogofindz.backend.exception;

public class CategoryInUseException extends RuntimeException {
    public CategoryInUseException(String message) {
        super(message);
    }
}
```

- [ ] **Step 5: Write `GlobalExceptionHandler`**

```java
package com.twogofindz.backend.exception;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.ValidationErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fieldError ->
                errors.put(fieldError.getField(), fieldError.getDefaultMessage()));
        return ResponseEntity.badRequest().body(ValidationErrorResponse.of(errors));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.failure(ex.getMessage()));
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiResponse<Void>> handleDuplicate(DuplicateResourceException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.failure(ex.getMessage()));
    }

    @ExceptionHandler(CategoryInUseException.class)
    public ResponseEntity<ApiResponse<Void>> handleCategoryInUse(CategoryInUseException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.failure(ex.getMessage()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.failure("Invalid username or password."));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.failure("You do not have permission to perform this action."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.failure("An unexpected error occurred. Please try again later."));
    }
}
```

- [ ] **Step 6: Write the security classes**

`SecurityUser.java`:
```java
package com.twogofindz.backend.security;

import com.twogofindz.backend.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class SecurityUser implements UserDetails {

    private final User user;

    public SecurityUser(User user) {
        this.user = user;
    }

    public String getFullName() {
        return user.getFullName();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole()));
    }

    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return user.getUsername();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return user.isActive();
    }
}
```

`UserDetailsServiceImpl.java`:
```java
package com.twogofindz.backend.security;

import com.twogofindz.backend.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsernameAndActiveTrue(username)
                .map(SecurityUser::new)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }
}
```

`JwtTokenProvider.java`:
```java
package com.twogofindz.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long expirationMs;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(String username, String role) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
                .subject(username)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    public String getUsernameFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException | SignatureException | IllegalArgumentException ex) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
```

`JwtAuthFilter.java`:
```java
package com.twogofindz.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsServiceImpl userDetailsService;

    public JwtAuthFilter(JwtTokenProvider jwtTokenProvider, UserDetailsServiceImpl userDetailsService) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (jwtTokenProvider.validateToken(token)) {
                String username = jwtTokenProvider.getUsernameFromToken(token);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                var authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        filterChain.doFilter(request, response);
    }
}
```

`RestAuthenticationEntryPoint.java`:
```java
package com.twogofindz.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.twogofindz.backend.dto.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                          AuthenticationException authException) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write(objectMapper.writeValueAsString(
                ApiResponse.failure("Authentication is required to access this resource.")));
    }
}
```

`RestAccessDeniedHandler.java`:
```java
package com.twogofindz.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.twogofindz.backend.dto.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    public RestAccessDeniedHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                        AccessDeniedException accessDeniedException) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.getWriter().write(objectMapper.writeValueAsString(
                ApiResponse.failure("You do not have permission to perform this action.")));
    }
}
```

- [ ] **Step 7: Write `SecurityConfig`**

```java
package com.twogofindz.backend.config;

import com.twogofindz.backend.security.JwtAuthFilter;
import com.twogofindz.backend.security.RestAccessDeniedHandler;
import com.twogofindz.backend.security.RestAuthenticationEntryPoint;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;

    @Value("${app.cors.allowed-origin}")
    private String allowedOrigin;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter,
                           RestAuthenticationEntryPoint authenticationEntryPoint,
                           RestAccessDeniedHandler accessDeniedHandler) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(allowedOrigin));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {})
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**", "/api/public/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

- [ ] **Step 8: Write the login DTOs, service, and controller**

`LoginRequest.java`:
```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Username is required.") String username,
        @NotBlank(message = "Password is required.") String password
) {
}
```

`LoginResponse.java`:
```java
package com.twogofindz.backend.dto.response;

public record LoginResponse(
        String token,
        String username,
        String fullName,
        String role
) {
}
```

`AuthService.java`:
```java
package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.LoginRequest;
import com.twogofindz.backend.dto.response.LoginResponse;

public interface AuthService {
    LoginResponse login(LoginRequest request);
}
```

`AuthServiceImpl.java`:
```java
package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.LoginRequest;
import com.twogofindz.backend.dto.response.LoginResponse;
import com.twogofindz.backend.security.JwtTokenProvider;
import com.twogofindz.backend.security.SecurityUser;
import com.twogofindz.backend.service.AuthService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthServiceImpl(AuthenticationManager authenticationManager, JwtTokenProvider jwtTokenProvider) {
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        SecurityUser principal = (SecurityUser) authentication.getPrincipal();
        String role = principal.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        String token = jwtTokenProvider.generateToken(principal.getUsername(), role);

        return new LoginResponse(token, principal.getUsername(), principal.getFullName(), role);
    }
}
```

`AuthController.java`:
```java
package com.twogofindz.backend.controller;

import com.twogofindz.backend.dto.request.LoginRequest;
import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.LoginResponse;
import com.twogofindz.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success("Login successful.", authService.login(request));
    }
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `cd backend && mvn test -Dtest=AuthControllerTest`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/dto \
        backend/src/main/java/com/twogofindz/backend/exception \
        backend/src/main/java/com/twogofindz/backend/security \
        backend/src/main/java/com/twogofindz/backend/config \
        backend/src/main/java/com/twogofindz/backend/service \
        backend/src/main/java/com/twogofindz/backend/controller \
        backend/src/test/java/com/twogofindz/backend/controller/AuthControllerTest.java
git commit -m "feat: add JWT auth, response envelope, and global exception handling"
```

---

### Task 4: Product category CRUD (create/update/list — delete comes in Task 6)

**Files:**
- Create: `backend/src/main/resources/db/migration/V3__create_product_categories_table.sql`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/ProductCategory.java`
- Create: `backend/src/main/java/com/twogofindz/backend/repository/ProductCategoryRepository.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/CategoryRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/CategoryResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicCategoryResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/mapper/CategoryMapper.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/CategoryService.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/impl/CategoryServiceImpl.java`
- Create: `backend/src/main/java/com/twogofindz/backend/controller/admin/AdminCategoryController.java`
- Create: `backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicCategoryController.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminCategoryControllerTest.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicCategoryControllerTest.java`

**Interfaces:**
- Consumes: `ApiResponse`, `ValidationErrorResponse`, `GlobalExceptionHandler`, `ResourceNotFoundException`, `DuplicateResourceException` (Task 3); `/api/auth/login` for obtaining test tokens (Task 3)
- Produces: `ProductCategory` entity (`id, productCategoryName, commissionRate: BigDecimal, createdAt, updatedAt`); `ProductCategoryRepository.existsByProductCategoryNameIgnoreCase(String): boolean`, `.findByProductCategoryNameIgnoreCase(String): Optional<ProductCategory>`; `CategoryService` with `create(CategoryRequest): CategoryResponse`, `update(Long, CategoryRequest): CategoryResponse`, `getById(Long): CategoryResponse`, `getAll(String sortBy, String direction): List<CategoryResponse>`, `getAllForPublic(): List<PublicCategoryResponse>` (Task 6 adds `delete(Long): void` to this same interface/impl) — Task 5 (`Product`) consumes `ProductCategory` and `ProductCategoryRepository`.

- [ ] **Step 1: Write the failing tests**

`AdminCategoryControllerTest.java`:
```java
package com.twogofindz.backend.controller.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.CategoryRequest;
import com.twogofindz.backend.dto.request.LoginRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class AdminCategoryControllerTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String adminToken() throws Exception {
        var result = mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("johnrovs", "admin123"))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("token").asText();
    }

    @Test
    void create_succeeds_withValidPayload() throws Exception {
        String token = adminToken();
        CategoryRequest request = new CategoryRequest("Electronics", new BigDecimal("4.50"));

        mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.productCategoryName").value("Electronics"))
                .andExpect(jsonPath("$.data.commissionRate").value(4.50));
    }

    @Test
    void create_returns409_onDuplicateName() throws Exception {
        String token = adminToken();
        CategoryRequest request = new CategoryRequest("Home & Kitchen", new BigDecimal("5.00"));

        mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    void create_returns400_whenCommissionRateOutOfRange() throws Exception {
        String token = adminToken();
        CategoryRequest request = new CategoryRequest("Invalid Rate Category", new BigDecimal("150.00"));

        mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns401_withoutToken() throws Exception {
        CategoryRequest request = new CategoryRequest("No Auth Category", new BigDecimal("3.00"));

        mockMvc.perform(post("/api/admin/categories")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}
```

`PublicCategoryControllerTest.java`:
```java
package com.twogofindz.backend.controller.publicapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.CategoryRequest;
import com.twogofindz.backend.dto.request.LoginRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class PublicCategoryControllerTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void getAll_neverExposesCommissionRate() throws Exception {
        var loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("johnrovs", "admin123"))))
                .andReturn();
        String token = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .path("data").path("token").asText();

        mockMvc.perform(post("/api/admin/categories")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CategoryRequest("Toys", new BigDecimal("6.00")))));

        mockMvc.perform(get("/api/public/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].productCategoryName").exists())
                .andExpect(jsonPath("$.data[0].commissionRate").doesNotExist());
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && mvn test -Dtest=AdminCategoryControllerTest,PublicCategoryControllerTest`
Expected: FAIL — compilation error (classes below don't exist yet).

- [ ] **Step 3: Write the migration**

`V3__create_product_categories_table.sql`:
```sql
CREATE TABLE product_categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_category_name VARCHAR(100) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_categories_name UNIQUE (product_category_name),
    CONSTRAINT chk_commission_rate_range CHECK (commission_rate >= 0.00 AND commission_rate <= 100.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 4: Write the entity and repository**

`ProductCategory.java`:
```java
package com.twogofindz.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_category_name", nullable = false, unique = true, length = 100)
    private String productCategoryName;

    @Column(name = "commission_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal commissionRate;

    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false)
    private LocalDateTime updatedAt;
}
```

`ProductCategoryRepository.java`:
```java
package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.ProductCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductCategoryRepository extends JpaRepository<ProductCategory, Long> {
    boolean existsByProductCategoryNameIgnoreCase(String name);
    Optional<ProductCategory> findByProductCategoryNameIgnoreCase(String name);
}
```

- [ ] **Step 5: Write the DTOs and mapper**

`CategoryRequest.java`:
```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CategoryRequest(
        @NotBlank(message = "Category name is required.") String productCategoryName,

        @NotNull(message = "Commission rate is required.")
        @DecimalMin(value = "0.00", message = "Commission rate must be between 0 and 100.")
        @DecimalMax(value = "100.00", message = "Commission rate must be between 0 and 100.")
        BigDecimal commissionRate
) {
}
```

`CategoryResponse.java` (admin-only — includes commission rate):
```java
package com.twogofindz.backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CategoryResponse(
        Long id,
        String productCategoryName,
        BigDecimal commissionRate,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
```

`PublicCategoryResponse.java` (public — no commission rate):
```java
package com.twogofindz.backend.dto.response;

public record PublicCategoryResponse(
        Long id,
        String productCategoryName
) {
}
```

`CategoryMapper.java`:
```java
package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.CategoryResponse;
import com.twogofindz.backend.dto.response.PublicCategoryResponse;
import com.twogofindz.backend.entity.ProductCategory;
import org.springframework.stereotype.Component;

@Component
public class CategoryMapper {

    public CategoryResponse toResponse(ProductCategory category) {
        return new CategoryResponse(
                category.getId(),
                category.getProductCategoryName(),
                category.getCommissionRate(),
                category.getCreatedAt(),
                category.getUpdatedAt()
        );
    }

    public PublicCategoryResponse toPublicResponse(ProductCategory category) {
        return new PublicCategoryResponse(category.getId(), category.getProductCategoryName());
    }
}
```

- [ ] **Step 6: Write `CategoryService` and its implementation**

`CategoryService.java`:
```java
package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.CategoryRequest;
import com.twogofindz.backend.dto.response.CategoryResponse;
import com.twogofindz.backend.dto.response.PublicCategoryResponse;

import java.util.List;

public interface CategoryService {
    CategoryResponse create(CategoryRequest request);
    CategoryResponse update(Long id, CategoryRequest request);
    CategoryResponse getById(Long id);
    List<CategoryResponse> getAll(String sortBy, String direction);
    List<PublicCategoryResponse> getAllForPublic();
}
```

`CategoryServiceImpl.java`:
```java
package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.CategoryRequest;
import com.twogofindz.backend.dto.response.CategoryResponse;
import com.twogofindz.backend.dto.response.PublicCategoryResponse;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.exception.DuplicateResourceException;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.mapper.CategoryMapper;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import com.twogofindz.backend.service.CategoryService;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoryServiceImpl implements CategoryService {

    private final ProductCategoryRepository categoryRepository;
    private final CategoryMapper categoryMapper;

    public CategoryServiceImpl(ProductCategoryRepository categoryRepository, CategoryMapper categoryMapper) {
        this.categoryRepository = categoryRepository;
        this.categoryMapper = categoryMapper;
    }

    @Override
    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        if (categoryRepository.existsByProductCategoryNameIgnoreCase(request.productCategoryName())) {
            throw new DuplicateResourceException(
                    "A category named '" + request.productCategoryName() + "' already exists.");
        }
        ProductCategory category = ProductCategory.builder()
                .productCategoryName(request.productCategoryName())
                .commissionRate(request.commissionRate())
                .build();
        return categoryMapper.toResponse(categoryRepository.save(category));
    }

    @Override
    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        ProductCategory category = findEntityById(id);

        categoryRepository.findByProductCategoryNameIgnoreCase(request.productCategoryName())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException(
                            "A category named '" + request.productCategoryName() + "' already exists.");
                });

        category.setProductCategoryName(request.productCategoryName());
        category.setCommissionRate(request.commissionRate());
        return categoryMapper.toResponse(categoryRepository.save(category));
    }

    @Override
    public CategoryResponse getById(Long id) {
        return categoryMapper.toResponse(findEntityById(id));
    }

    @Override
    public List<CategoryResponse> getAll(String sortBy, String direction) {
        return categoryRepository.findAll(buildSort(sortBy, direction)).stream()
                .map(categoryMapper::toResponse)
                .toList();
    }

    @Override
    public List<PublicCategoryResponse> getAllForPublic() {
        return categoryRepository.findAll(Sort.by(Sort.Direction.ASC, "productCategoryName")).stream()
                .map(categoryMapper::toPublicResponse)
                .toList();
    }

    private Sort buildSort(String sortBy, String direction) {
        Sort.Direction sortDirection = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        String property = (sortBy == null || sortBy.isBlank()) ? "productCategoryName" : sortBy;
        return Sort.by(sortDirection, property);
    }

    ProductCategory findEntityById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
    }
}
```

- [ ] **Step 7: Write the controllers**

`AdminCategoryController.java`:
```java
package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.dto.request.CategoryRequest;
import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.CategoryResponse;
import com.twogofindz.backend.service.CategoryService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/categories")
public class AdminCategoryController {

    private final CategoryService categoryService;

    public AdminCategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public ApiResponse<List<CategoryResponse>> getAll(
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false, defaultValue = "asc") String direction) {
        return ApiResponse.success("Categories retrieved successfully.", categoryService.getAll(sortBy, direction));
    }

    @GetMapping("/{id}")
    public ApiResponse<CategoryResponse> getById(@PathVariable Long id) {
        return ApiResponse.success("Category retrieved successfully.", categoryService.getById(id));
    }

    @PostMapping
    public ApiResponse<CategoryResponse> create(@Valid @RequestBody CategoryRequest request) {
        return ApiResponse.success("Category created successfully.", categoryService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<CategoryResponse> update(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return ApiResponse.success("Category updated successfully.", categoryService.update(id, request));
    }
}
```

`PublicCategoryController.java`:
```java
package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.PublicCategoryResponse;
import com.twogofindz.backend.service.CategoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/categories")
public class PublicCategoryController {

    private final CategoryService categoryService;

    public PublicCategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public ApiResponse<List<PublicCategoryResponse>> getAll() {
        return ApiResponse.success("Categories retrieved successfully.", categoryService.getAllForPublic());
    }
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd backend && mvn test -Dtest=AdminCategoryControllerTest,PublicCategoryControllerTest`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/resources/db/migration/V3__create_product_categories_table.sql \
        backend/src/main/java/com/twogofindz/backend/entity/ProductCategory.java \
        backend/src/main/java/com/twogofindz/backend/repository/ProductCategoryRepository.java \
        backend/src/main/java/com/twogofindz/backend/dto/request/CategoryRequest.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/CategoryResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/PublicCategoryResponse.java \
        backend/src/main/java/com/twogofindz/backend/mapper/CategoryMapper.java \
        backend/src/main/java/com/twogofindz/backend/service/CategoryService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/CategoryServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/controller/admin/AdminCategoryController.java \
        backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicCategoryController.java \
        backend/src/test/java/com/twogofindz/backend/controller
git commit -m "feat: add product category CRUD with admin/public response split"
```

---

### Task 5: Product CRUD with search/filter/sort/pagination

**Files:**
- Create: `backend/src/main/resources/db/migration/V4__create_products_table.sql`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/Product.java`
- Create: `backend/src/main/java/com/twogofindz/backend/repository/ProductRepository.java`
- Create: `backend/src/main/java/com/twogofindz/backend/repository/spec/ProductSpecifications.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/ProductRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/ProductResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/mapper/ProductMapper.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/ProductService.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/impl/ProductServiceImpl.java`
- Create: `backend/src/main/java/com/twogofindz/backend/controller/admin/AdminProductController.java`
- Create: `backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicProductController.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminProductControllerTest.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicProductControllerTest.java`

**Interfaces:**
- Consumes: `ProductCategory`, `ProductCategoryRepository` (Task 4); `ApiResponse`, `ResourceNotFoundException` (Task 3)
- Produces: `Product` entity (`id, name, description, category: ProductCategory, imageFileName, productPrice: BigDecimal, productLink, trending, bestSeller, active, createdAt, updatedAt`); `ProductRepository.existsByCategoryId(Long): boolean` — Task 6 uses this for the category delete-protection check.

- [ ] **Step 1: Write the failing tests**

`AdminProductControllerTest.java`:
```java
package com.twogofindz.backend.controller.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.CategoryRequest;
import com.twogofindz.backend.dto.request.LoginRequest;
import com.twogofindz.backend.dto.request.ProductRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class AdminProductControllerTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String adminToken() throws Exception {
        var result = mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("johnrovs", "admin123"))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("token").asText();
    }

    private Long createCategory(String token, String name) throws Exception {
        var result = mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CategoryRequest(name, new BigDecimal("5.00")))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }

    @Test
    void create_succeeds_withValidPayload() throws Exception {
        String token = adminToken();
        Long categoryId = createCategory(token, "Kitchen Gadgets");
        ProductRequest request = new ProductRequest(
                "Air Fryer", "A compact 4-quart air fryer.", categoryId, null,
                new BigDecimal("79.99"), "https://amazon.com/dp/example", true, false, true);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Air Fryer"))
                .andExpect(jsonPath("$.data.categoryName").value("Kitchen Gadgets"));
    }

    @Test
    void create_returns400_withNegativePrice() throws Exception {
        String token = adminToken();
        Long categoryId = createCategory(token, "Negative Price Category");
        ProductRequest request = new ProductRequest(
                "Bad Product", "Invalid price.", categoryId, null,
                new BigDecimal("-1.00"), "https://amazon.com/dp/example", false, false, true);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_withNonHttpsLink() throws Exception {
        String token = adminToken();
        Long categoryId = createCategory(token, "Insecure Link Category");
        ProductRequest request = new ProductRequest(
                "Bad Link Product", "Invalid link.", categoryId, null,
                new BigDecimal("10.00"), "http://amazon.com/dp/example", false, false, true);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns404_whenCategoryDoesNotExist() throws Exception {
        String token = adminToken();
        ProductRequest request = new ProductRequest(
                "Orphan Product", "No such category.", 999999L, null,
                new BigDecimal("10.00"), "https://amazon.com/dp/example", false, false, true);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_softDeletes_settingActiveFalse() throws Exception {
        String token = adminToken();
        Long categoryId = createCategory(token, "Soft Delete Category");
        ProductRequest request = new ProductRequest(
                "Deletable Product", "Will be soft-deleted.", categoryId, null,
                new BigDecimal("20.00"), "https://amazon.com/dp/example", false, false, true);

        var createResult = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();
        Long productId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/admin/products/{id}", productId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/admin/products/{id}", productId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data.active").value(false));
    }
}
```

`PublicProductControllerTest.java`:
```java
package com.twogofindz.backend.controller.publicapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.CategoryRequest;
import com.twogofindz.backend.dto.request.LoginRequest;
import com.twogofindz.backend.dto.request.ProductRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class PublicProductControllerTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String adminToken() throws Exception {
        var result = mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("johnrovs", "admin123"))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("token").asText();
    }

    @Test
    void search_neverReturnsInactiveProducts() throws Exception {
        String token = adminToken();
        var categoryResult = mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CategoryRequest("Public Test Category", new BigDecimal("5.00")))))
                .andReturn();
        Long categoryId = objectMapper.readTree(categoryResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        ProductRequest inactiveProduct = new ProductRequest(
                "Hidden Product", "Should never show publicly.", categoryId, null,
                new BigDecimal("15.00"), "https://amazon.com/dp/hidden", false, false, false);

        mockMvc.perform(post("/api/admin/products")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(inactiveProduct)));

        mockMvc.perform(get("/api/public/products").param("search", "Hidden Product"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isEmpty());
    }

    @Test
    void getById_returns404_forUnknownProduct() throws Exception {
        mockMvc.perform(get("/api/public/products/{id}", 999999L))
                .andExpect(status().isNotFound());
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && mvn test -Dtest=AdminProductControllerTest,PublicProductControllerTest`
Expected: FAIL — compilation error (classes below don't exist yet).

- [ ] **Step 3: Write the migration**

`V4__create_products_table.sql`:
```sql
CREATE TABLE products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    product_category_id BIGINT NOT NULL,
    image_file_name VARCHAR(255) NULL,
    product_price DECIMAL(10,2) NOT NULL,
    product_link VARCHAR(2048) NOT NULL,
    is_trending BOOLEAN NOT NULL DEFAULT FALSE,
    is_best_seller BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category FOREIGN KEY (product_category_id)
        REFERENCES product_categories (id) ON DELETE RESTRICT,
    CONSTRAINT chk_products_price_non_negative CHECK (product_price >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_products_name ON products (name);
CREATE INDEX idx_products_category ON products (product_category_id);
CREATE INDEX idx_products_created_at ON products (created_at);
CREATE INDEX idx_products_trending ON products (is_trending);
CREATE INDEX idx_products_best_seller ON products (is_best_seller);
```

- [ ] **Step 4: Write the entity, repository, and specifications**

`Product.java`:
```java
package com.twogofindz.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_category_id", nullable = false)
    private ProductCategory category;

    @Column(name = "image_file_name")
    private String imageFileName;

    @Column(name = "product_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal productPrice;

    @Column(name = "product_link", nullable = false, length = 2048)
    private String productLink;

    @Column(name = "is_trending", nullable = false)
    private boolean trending;

    @Column(name = "is_best_seller", nullable = false)
    private boolean bestSeller;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false)
    private LocalDateTime updatedAt;
}
```

`ProductRepository.java`:
```java
package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    boolean existsByCategoryId(Long categoryId);
}
```

`ProductSpecifications.java`:
```java
package com.twogofindz.backend.repository.spec;

import com.twogofindz.backend.entity.Product;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;

public final class ProductSpecifications {

    private ProductSpecifications() {
    }

    public static Specification<Product> search(String term) {
        return (root, query, cb) -> {
            if (term == null || term.isBlank()) {
                return cb.conjunction();
            }
            String like = "%" + term.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(root.get("description")), like),
                    cb.like(cb.lower(root.get("category").get("productCategoryName")), like)
            );
        };
    }

    public static Specification<Product> hasCategoryId(Long categoryId) {
        return (root, query, cb) ->
                categoryId == null ? cb.conjunction() : cb.equal(root.get("category").get("id"), categoryId);
    }

    public static Specification<Product> isTrending(Boolean trending) {
        return (root, query, cb) ->
                trending == null ? cb.conjunction() : cb.equal(root.get("trending"), trending);
    }

    public static Specification<Product> isBestSeller(Boolean bestSeller) {
        return (root, query, cb) ->
                bestSeller == null ? cb.conjunction() : cb.equal(root.get("bestSeller"), bestSeller);
    }

    public static Specification<Product> isActive(Boolean active) {
        return (root, query, cb) ->
                active == null ? cb.conjunction() : cb.equal(root.get("active"), active);
    }

    public static Specification<Product> priceBetween(BigDecimal min, BigDecimal max) {
        return (root, query, cb) -> {
            if (min == null && max == null) {
                return cb.conjunction();
            }
            if (min != null && max != null) {
                return cb.between(root.get("productPrice"), min, max);
            }
            return min != null
                    ? cb.greaterThanOrEqualTo(root.get("productPrice"), min)
                    : cb.lessThanOrEqualTo(root.get("productPrice"), max);
        };
    }
}
```

- [ ] **Step 5: Write the DTOs and mapper**

`ProductRequest.java`:
```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

public record ProductRequest(
        @NotBlank(message = "Product name is required.") String name,
        @NotBlank(message = "Description is required.") String description,
        @NotNull(message = "Category is required.") Long categoryId,
        String imageFileName,

        @NotNull(message = "Price is required.")
        @DecimalMin(value = "0.00", message = "Price must be greater than or equal to zero.")
        BigDecimal productPrice,

        @NotBlank(message = "Product URL is required.")
        @Pattern(regexp = "^https://.+", message = "Product URL must be a valid HTTPS link.")
        String productLink,

        boolean trending,
        boolean bestSeller,
        boolean active
) {
}
```

`ProductResponse.java`:
```java
package com.twogofindz.backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProductResponse(
        Long id,
        String name,
        String description,
        Long categoryId,
        String categoryName,
        String imageFileName,
        BigDecimal productPrice,
        String productLink,
        boolean trending,
        boolean bestSeller,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
```

`ProductMapper.java`:
```java
package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.ProductResponse;
import com.twogofindz.backend.entity.Product;
import org.springframework.stereotype.Component;

@Component
public class ProductMapper {

    public ProductResponse toResponse(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getCategory().getId(),
                product.getCategory().getProductCategoryName(),
                product.getImageFileName(),
                product.getProductPrice(),
                product.getProductLink(),
                product.isTrending(),
                product.isBestSeller(),
                product.isActive(),
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }
}
```

- [ ] **Step 6: Write `ProductService` and its implementation**

`ProductService.java`:
```java
package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.ProductRequest;
import com.twogofindz.backend.dto.response.ProductResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;

public interface ProductService {
    ProductResponse create(ProductRequest request);
    ProductResponse update(Long id, ProductRequest request);
    ProductResponse getById(Long id);
    void softDelete(Long id);
    Page<ProductResponse> search(
            String term, Long categoryId, Boolean trending, Boolean bestSeller, Boolean active,
            BigDecimal minPrice, BigDecimal maxPrice, Pageable pageable);
}
```

`ProductServiceImpl.java`:
```java
package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.ProductRequest;
import com.twogofindz.backend.dto.response.ProductResponse;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.mapper.ProductMapper;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import com.twogofindz.backend.repository.ProductRepository;
import com.twogofindz.backend.repository.spec.ProductSpecifications;
import com.twogofindz.backend.service.ProductService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final ProductCategoryRepository categoryRepository;
    private final ProductMapper productMapper;

    public ProductServiceImpl(ProductRepository productRepository,
                               ProductCategoryRepository categoryRepository,
                               ProductMapper productMapper) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.productMapper = productMapper;
    }

    @Override
    @Transactional
    public ProductResponse create(ProductRequest request) {
        ProductCategory category = findCategory(request.categoryId());
        Product product = Product.builder()
                .name(request.name())
                .description(request.description())
                .category(category)
                .imageFileName(request.imageFileName())
                .productPrice(request.productPrice())
                .productLink(request.productLink())
                .trending(request.trending())
                .bestSeller(request.bestSeller())
                .active(request.active())
                .build();
        return productMapper.toResponse(productRepository.save(product));
    }

    @Override
    @Transactional
    public ProductResponse update(Long id, ProductRequest request) {
        Product product = findProduct(id);
        ProductCategory category = findCategory(request.categoryId());

        product.setName(request.name());
        product.setDescription(request.description());
        product.setCategory(category);
        product.setImageFileName(request.imageFileName());
        product.setProductPrice(request.productPrice());
        product.setProductLink(request.productLink());
        product.setTrending(request.trending());
        product.setBestSeller(request.bestSeller());
        product.setActive(request.active());

        return productMapper.toResponse(productRepository.save(product));
    }

    @Override
    public ProductResponse getById(Long id) {
        return productMapper.toResponse(findProduct(id));
    }

    @Override
    @Transactional
    public void softDelete(Long id) {
        Product product = findProduct(id);
        product.setActive(false);
        productRepository.save(product);
    }

    @Override
    public Page<ProductResponse> search(String term, Long categoryId, Boolean trending, Boolean bestSeller,
                                         Boolean active, BigDecimal minPrice, BigDecimal maxPrice, Pageable pageable) {
        Specification<Product> spec = Specification
                .where(ProductSpecifications.search(term))
                .and(ProductSpecifications.hasCategoryId(categoryId))
                .and(ProductSpecifications.isTrending(trending))
                .and(ProductSpecifications.isBestSeller(bestSeller))
                .and(ProductSpecifications.isActive(active))
                .and(ProductSpecifications.priceBetween(minPrice, maxPrice));

        return productRepository.findAll(spec, pageable).map(productMapper::toResponse);
    }

    private Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
    }

    private ProductCategory findCategory(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
    }
}
```

- [ ] **Step 7: Write the controllers**

`AdminProductController.java`:
```java
package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.dto.request.ProductRequest;
import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.ProductResponse;
import com.twogofindz.backend.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/admin/products")
public class AdminProductController {

    private final ProductService productService;

    public AdminProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ApiResponse<Page<ProductResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Boolean trending,
            @RequestParam(required = false) Boolean bestSeller,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ApiResponse.success("Products retrieved successfully.",
                productService.search(search, categoryId, trending, bestSeller, active, minPrice, maxPrice, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<ProductResponse> getById(@PathVariable Long id) {
        return ApiResponse.success("Product retrieved successfully.", productService.getById(id));
    }

    @PostMapping
    public ApiResponse<ProductResponse> create(@Valid @RequestBody ProductRequest request) {
        return ApiResponse.success("Product created successfully.", productService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<ProductResponse> update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return ApiResponse.success("Product updated successfully.", productService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        productService.softDelete(id);
        return ApiResponse.success("Product deleted successfully.");
    }
}
```

`PublicProductController.java`:
```java
package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.ProductResponse;
import com.twogofindz.backend.service.ProductService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/public/products")
public class PublicProductController {

    private final ProductService productService;

    public PublicProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ApiResponse<Page<ProductResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Boolean trending,
            @RequestParam(required = false) Boolean bestSeller,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @PageableDefault(size = 12, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable) {
        // Public visitors only ever see active products, regardless of any client-supplied filter.
        return ApiResponse.success("Products retrieved successfully.",
                productService.search(search, categoryId, trending, bestSeller, true, minPrice, maxPrice, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<ProductResponse> getById(@PathVariable Long id) {
        return ApiResponse.success("Product retrieved successfully.", productService.getById(id));
    }
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd backend && mvn test -Dtest=AdminProductControllerTest,PublicProductControllerTest`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/resources/db/migration/V4__create_products_table.sql \
        backend/src/main/java/com/twogofindz/backend/entity/Product.java \
        backend/src/main/java/com/twogofindz/backend/repository/ProductRepository.java \
        backend/src/main/java/com/twogofindz/backend/repository/spec \
        backend/src/main/java/com/twogofindz/backend/dto/request/ProductRequest.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/ProductResponse.java \
        backend/src/main/java/com/twogofindz/backend/mapper/ProductMapper.java \
        backend/src/main/java/com/twogofindz/backend/service/ProductService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/ProductServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/controller/admin/AdminProductController.java \
        backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicProductController.java \
        backend/src/test/java/com/twogofindz/backend/controller
git commit -m "feat: add product CRUD with Specification-based search/filter/sort/pagination"
```

---

### Task 6: Category delete protection (block delete when products are assigned)

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/service/CategoryService.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/CategoryServiceImpl.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/controller/admin/AdminCategoryController.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/CategoryDeleteTest.java`

**Interfaces:**
- Consumes: `CategoryService`/`CategoryServiceImpl` (Task 4), `ProductRepository.existsByCategoryId(Long): boolean` (Task 5), `CategoryInUseException` (Task 3)
- Produces: `CategoryService.delete(Long id): void`; `DELETE /api/admin/categories/{id}`

- [ ] **Step 1: Write the failing test**

```java
package com.twogofindz.backend.controller.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.CategoryRequest;
import com.twogofindz.backend.dto.request.LoginRequest;
import com.twogofindz.backend.dto.request.ProductRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class CategoryDeleteTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String adminToken() throws Exception {
        var result = mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("johnrovs", "admin123"))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("token").asText();
    }

    private Long createCategory(String token, String name) throws Exception {
        var result = mockMvc.perform(post("/api/admin/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CategoryRequest(name, new BigDecimal("5.00")))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }

    @Test
    void delete_succeeds_whenNoProductsAssigned() throws Exception {
        String token = adminToken();
        Long categoryId = createCategory(token, "Empty Category");

        mockMvc.perform(delete("/api/admin/categories/{id}", categoryId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void delete_returns409_whenProductsAssigned() throws Exception {
        String token = adminToken();
        Long categoryId = createCategory(token, "In Use Category");
        ProductRequest product = new ProductRequest(
                "Blocking Product", "Keeps the category in use.", categoryId, null,
                new BigDecimal("25.00"), "https://amazon.com/dp/blocking", false, false, true);

        mockMvc.perform(post("/api/admin/products")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(product)));

        mockMvc.perform(delete("/api/admin/categories/{id}", categoryId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn test -Dtest=CategoryDeleteTest`
Expected: FAIL — `405 Method Not Allowed` (no `DELETE` mapping exists yet).

- [ ] **Step 3: Modify `CategoryService` to add `delete`**

Add this method to the interface:
```java
void delete(Long id);
```

- [ ] **Step 4: Modify `CategoryServiceImpl` to inject `ProductRepository` and implement `delete`**

Change the constructor to also accept `ProductRepository`:
```java
private final ProductCategoryRepository categoryRepository;
private final ProductRepository productRepository;
private final CategoryMapper categoryMapper;

public CategoryServiceImpl(ProductCategoryRepository categoryRepository,
                            ProductRepository productRepository,
                            CategoryMapper categoryMapper) {
    this.categoryRepository = categoryRepository;
    this.productRepository = productRepository;
    this.categoryMapper = categoryMapper;
}
```

Add the import `com.twogofindz.backend.exception.CategoryInUseException` and `com.twogofindz.backend.repository.ProductRepository`, then add this method:
```java
@Override
@Transactional
public void delete(Long id) {
    ProductCategory category = findEntityById(id);
    if (productRepository.existsByCategoryId(id)) {
        throw new CategoryInUseException(
                "Cannot delete category '" + category.getProductCategoryName() +
                "' because one or more products are assigned to it. Reassign or remove those products first.");
    }
    categoryRepository.delete(category);
}
```

- [ ] **Step 5: Modify `AdminCategoryController` to add the delete endpoint**

Add the import `org.springframework.web.bind.annotation.DeleteMapping`, then add:
```java
@DeleteMapping("/{id}")
public ApiResponse<Void> delete(@PathVariable Long id) {
    categoryService.delete(id);
    return ApiResponse.success("Category deleted successfully.");
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && mvn test -Dtest=CategoryDeleteTest`
Expected: PASS

- [ ] **Step 7: Run the full test suite to confirm no regressions**

Run: `cd backend && mvn test`
Expected: PASS (all tests from Tasks 2–6)

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/service/CategoryService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/CategoryServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/controller/admin/AdminCategoryController.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/CategoryDeleteTest.java
git commit -m "feat: block category deletion when products are assigned"
```

---

### Task 7: Cross-cutting authorization tests + real local verification

**Files:**
- Test: `backend/src/test/java/com/twogofindz/backend/controller/AuthorizationTest.java`

**Interfaces:**
- Consumes: every controller from Tasks 3–6
- Produces: nothing further downstream — this is the stage's final verification gate.

- [ ] **Step 1: Write the authorization test**

```java
package com.twogofindz.backend.controller;

import com.twogofindz.backend.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class AuthorizationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void adminEndpoint_rejectsRequestWithoutToken() throws Exception {
        mockMvc.perform(get("/api/admin/products"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminEndpoint_rejectsInvalidToken() throws Exception {
        mockMvc.perform(get("/api/admin/products")
                        .header("Authorization", "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void publicEndpoint_reachableWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/public/products"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/public/categories"))
                .andExpect(status().isOk());
    }
}
```

- [ ] **Step 2: Run the test**

Run: `cd backend && mvn test -Dtest=AuthorizationTest`
Expected: PASS

- [ ] **Step 3: Run the entire test suite one final time**

Run: `cd backend && mvn test`
Expected: PASS — every test from Tasks 2 through 7.

- [ ] **Step 4: Verify against a real local MySQL instance (not Testcontainers)**

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS two_go_findz;"
cd backend
cp .env.example .env   # then edit DB_PASSWORD and JWT_SECRET locally — never commit .env
export $(grep -v '^#' .env | xargs)
mvn spring-boot:run
```

In a second terminal, confirm the app boots with Flyway-applied schema and the seeded admin can log in:
```bash
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"johnrovs","password":"admin123"}' | python3 -m json.tool
```

Expected: JSON response with `"success": true` and a non-empty `data.token`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/java/com/twogofindz/backend/controller/AuthorizationTest.java
git commit -m "test: add cross-cutting authorization checks for admin/public endpoints"
```
