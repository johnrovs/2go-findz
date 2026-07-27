CREATE TABLE hero_banners (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    image_filename VARCHAR(255) NOT NULL,
    image_alt VARCHAR(255) NOT NULL,
    badge VARCHAR(100) NULL,
    headline VARCHAR(200) NOT NULL,
    description TEXT NULL,
    button_text VARCHAR(100) NOT NULL,
    button_link VARCHAR(255) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hero_banners_active_order (active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
