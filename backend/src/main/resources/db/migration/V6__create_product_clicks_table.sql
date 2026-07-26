CREATE TABLE product_clicks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    anonymous_session_id VARCHAR(64) NULL,
    clicked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_clicks_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_product_clicks_product ON product_clicks (product_id);
CREATE INDEX idx_product_clicks_clicked_at ON product_clicks (clicked_at);
