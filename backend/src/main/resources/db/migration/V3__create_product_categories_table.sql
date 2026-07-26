CREATE TABLE product_categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_category_name VARCHAR(100) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_categories_name UNIQUE (product_category_name),
    CONSTRAINT chk_commission_rate_range CHECK (commission_rate >= 0.00 AND commission_rate <= 100.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
