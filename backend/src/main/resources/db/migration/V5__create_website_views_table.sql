CREATE TABLE website_views (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    anonymous_session_id VARCHAR(64) NULL,
    viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_website_views_viewed_at ON website_views (viewed_at);
