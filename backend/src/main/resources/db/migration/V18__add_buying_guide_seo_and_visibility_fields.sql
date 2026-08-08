ALTER TABLE buying_guides
    ADD COLUMN focus_keyword VARCHAR(200) NULL,
    ADD COLUMN canonical_url VARCHAR(500) NULL,
    ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
    ADD COLUMN robots_index BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN robots_follow BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN open_graph_title VARCHAR(70) NULL,
    ADD COLUMN open_graph_description VARCHAR(200) NULL,
    ADD COLUMN open_graph_image_filename VARCHAR(255) NULL,
    ADD COLUMN twitter_card_type VARCHAR(30) NOT NULL DEFAULT 'summary_large_image',
    ADD COLUMN published_at TIMESTAMP NULL,
    ADD COLUMN published_by VARCHAR(100) NULL,
    ADD COLUMN updated_by VARCHAR(100) NULL;

CREATE TABLE buying_guide_seo_keywords (
    buying_guide_id BIGINT NOT NULL,
    keyword VARCHAR(60) NOT NULL,
    display_order INT NOT NULL,
    PRIMARY KEY (buying_guide_id, display_order),
    CONSTRAINT fk_buying_guide_seo_keywords_guide
        FOREIGN KEY (buying_guide_id) REFERENCES buying_guides (id) ON DELETE CASCADE
);
