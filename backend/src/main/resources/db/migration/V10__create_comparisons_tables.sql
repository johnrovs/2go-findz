-- display_order columns on the four @OneToMany owned-child tables below (comparison_products,
-- comparison_spec_rows, comparison_sections, comparison_faqs) need a DEFAULT: Hibernate persists
-- these via a two-phase INSERT-then-UPDATE for @OrderColumn on bidirectional @OneToMany
-- associations, so the initial INSERT omits display_order and needs a default to satisfy the
-- NOT NULL constraint. The two @ManyToMany join tables further down (comparison_related_*) don't
-- need this -- Hibernate writes their join rows (including display_order) in a single INSERT.
CREATE TABLE comparisons (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(220) NOT NULL,
    description VARCHAR(500) NOT NULL,
    cover_image_filename VARCHAR(255) NULL,
    product_category_id BIGINT NOT NULL,
    seo_title VARCHAR(200) NULL,
    seo_description VARCHAR(300) NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_comparisons_slug UNIQUE (slug),
    CONSTRAINT fk_comparisons_category FOREIGN KEY (product_category_id)
        REFERENCES product_categories (id),
    INDEX idx_comparisons_published_created (published, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE comparison_products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    comparison_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    badge VARCHAR(100) NULL,
    recommendation VARCHAR(500) NOT NULL,
    best_for VARCHAR(200) NOT NULL,
    main_strength VARCHAR(200) NOT NULL,
    main_weakness VARCHAR(200) NOT NULL,
    pros TEXT NULL,
    cons TEXT NULL,
    editors_score DECIMAL(3,1) NULL,
    CONSTRAINT fk_comparison_products_comparison FOREIGN KEY (comparison_id)
        REFERENCES comparisons (id) ON DELETE CASCADE,
    CONSTRAINT fk_comparison_products_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_comparison_products_comparison ON comparison_products (comparison_id);
CREATE INDEX idx_comparison_products_product ON comparison_products (product_id);

CREATE TABLE comparison_spec_rows (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    comparison_id BIGINT NOT NULL,
    group_label VARCHAR(100) NOT NULL,
    row_label VARCHAR(100) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_comparison_spec_rows_comparison FOREIGN KEY (comparison_id)
        REFERENCES comparisons (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_comparison_spec_rows_comparison ON comparison_spec_rows (comparison_id);

CREATE TABLE comparison_spec_values (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    spec_row_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    value VARCHAR(200) NOT NULL,
    tier VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
    CONSTRAINT fk_comparison_spec_values_row FOREIGN KEY (spec_row_id)
        REFERENCES comparison_spec_rows (id) ON DELETE CASCADE,
    CONSTRAINT fk_comparison_spec_values_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT uq_comparison_spec_values_row_product UNIQUE (spec_row_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE comparison_sections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    comparison_id BIGINT NOT NULL,
    heading VARCHAR(150) NOT NULL,
    body TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_comparison_sections_comparison FOREIGN KEY (comparison_id)
        REFERENCES comparisons (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_comparison_sections_comparison ON comparison_sections (comparison_id);

CREATE TABLE comparison_faqs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    comparison_id BIGINT NOT NULL,
    question VARCHAR(300) NOT NULL,
    answer TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_comparison_faqs_comparison FOREIGN KEY (comparison_id)
        REFERENCES comparisons (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_comparison_faqs_comparison ON comparison_faqs (comparison_id);

CREATE TABLE comparison_related_comparisons (
    comparison_id BIGINT NOT NULL,
    related_comparison_id BIGINT NOT NULL,
    display_order INT NOT NULL,
    PRIMARY KEY (comparison_id, display_order),
    CONSTRAINT fk_comparison_related_comparisons_comparison FOREIGN KEY (comparison_id)
        REFERENCES comparisons (id) ON DELETE CASCADE,
    CONSTRAINT fk_comparison_related_comparisons_related FOREIGN KEY (related_comparison_id)
        REFERENCES comparisons (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_comparison_related_comparisons_related ON comparison_related_comparisons (related_comparison_id);

CREATE TABLE comparison_related_products (
    comparison_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    display_order INT NOT NULL,
    PRIMARY KEY (comparison_id, display_order),
    CONSTRAINT fk_comparison_related_products_comparison FOREIGN KEY (comparison_id)
        REFERENCES comparisons (id) ON DELETE CASCADE,
    CONSTRAINT fk_comparison_related_products_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_comparison_related_products_product ON comparison_related_products (product_id);
