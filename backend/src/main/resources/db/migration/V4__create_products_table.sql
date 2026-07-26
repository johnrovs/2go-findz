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
