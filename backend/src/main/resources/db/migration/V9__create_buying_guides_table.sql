CREATE TABLE buying_guides (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    excerpt VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    cover_image_filename VARCHAR(255) NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_buying_guides_active_created (active, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE buying_guide_products (
    buying_guide_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    display_order INT NOT NULL,
    PRIMARY KEY (buying_guide_id, display_order),
    CONSTRAINT fk_buying_guide_products_guide FOREIGN KEY (buying_guide_id)
        REFERENCES buying_guides (id) ON DELETE CASCADE,
    CONSTRAINT fk_buying_guide_products_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_buying_guide_products_product ON buying_guide_products (product_id);
