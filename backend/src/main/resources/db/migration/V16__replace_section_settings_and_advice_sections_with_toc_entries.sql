DROP TABLE buying_guide_advice_sections;
DROP TABLE buying_guide_section_settings;

CREATE TABLE buying_guide_toc_entries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    buying_guide_id BIGINT NOT NULL,
    section_key VARCHAR(30) NULL,
    title VARCHAR(150) NULL,
    content TEXT NULL,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_toc_entries_guide FOREIGN KEY (buying_guide_id) REFERENCES buying_guides (id) ON DELETE CASCADE,
    CONSTRAINT uq_bg_toc_entries_guide_key UNIQUE (buying_guide_id, section_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_bg_toc_entries_guide ON buying_guide_toc_entries (buying_guide_id);
