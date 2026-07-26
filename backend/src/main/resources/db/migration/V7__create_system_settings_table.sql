CREATE TABLE system_settings (
    id BIGINT PRIMARY KEY,
    logo_image_filename VARCHAR(255) NULL,
    hero_image_filename VARCHAR(255) NULL,
    placeholder_image_filename VARCHAR(255) NULL,
    tiktok_url VARCHAR(500) NULL,
    pinterest_url VARCHAR(500) NULL,
    instagram_url VARCHAR(500) NULL,
    youtube_url VARCHAR(500) NULL,
    shop_bio TEXT NULL,
    hero_headline VARCHAR(255) NULL,
    hero_description TEXT NULL,
    affiliate_disclosure TEXT NULL,
    contact_email VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO system_settings (
    id, shop_bio, hero_headline, hero_description, affiliate_disclosure
) VALUES (
    1,
    'Discover trending Amazon products, everyday essentials, affordable finds, and must-have items carefully selected to help you shop smarter.',
    'Smart Finds. Better Buys. All in One Place.',
    'Discover trending Amazon products, everyday essentials, affordable finds, and must-have items carefully selected to help you shop smarter.',
    'As an Amazon Associate, 2Go Findz may earn from qualifying purchases. Product prices and availability may change at any time.'
);
