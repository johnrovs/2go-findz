CREATE TABLE buying_guide_views (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    buying_guide_id BIGINT NOT NULL,
    anonymous_session_id VARCHAR(64) NULL,
    viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_buying_guide_views_guide FOREIGN KEY (buying_guide_id)
        REFERENCES buying_guides (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_buying_guide_views_guide ON buying_guide_views (buying_guide_id);
CREATE INDEX idx_buying_guide_views_viewed_at ON buying_guide_views (viewed_at);
