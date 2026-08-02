CREATE TABLE buying_guide_quick_recommendations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    buying_guide_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    badge_name VARCHAR(60) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_quick_recs_guide FOREIGN KEY (buying_guide_id) REFERENCES buying_guides (id) ON DELETE CASCADE,
    CONSTRAINT fk_bg_quick_recs_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT uq_bg_quick_recs_guide_product UNIQUE (buying_guide_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_bg_quick_recs_product ON buying_guide_quick_recommendations (product_id);

CREATE TABLE buying_guide_comparison_specs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    buying_guide_id BIGINT NOT NULL,
    specification_name VARCHAR(100) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_comparison_specs_guide FOREIGN KEY (buying_guide_id) REFERENCES buying_guides (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_bg_comparison_specs_guide ON buying_guide_comparison_specs (buying_guide_id);

CREATE TABLE buying_guide_comparison_values (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    comparison_spec_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    specification_value VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_comparison_values_spec FOREIGN KEY (comparison_spec_id) REFERENCES buying_guide_comparison_specs (id) ON DELETE CASCADE,
    CONSTRAINT fk_bg_comparison_values_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT uq_bg_comparison_values_spec_product UNIQUE (comparison_spec_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE buying_guide_recommendation_sections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    buying_guide_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    recommendation_type VARCHAR(20) NOT NULL,
    section_label VARCHAR(100) NOT NULL,
    why_recommended TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    top_pick_guard INT GENERATED ALWAYS AS (CASE WHEN recommendation_type = 'TOP_PICK' THEN 1 ELSE NULL END) STORED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_recommendation_sections_guide FOREIGN KEY (buying_guide_id) REFERENCES buying_guides (id) ON DELETE CASCADE,
    CONSTRAINT fk_bg_recommendation_sections_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT uq_bg_recommendation_sections_top_pick UNIQUE (buying_guide_id, top_pick_guard)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_bg_recommendation_sections_guide ON buying_guide_recommendation_sections (buying_guide_id);

CREATE TABLE buying_guide_recommendation_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recommendation_section_id BIGINT NOT NULL,
    item_type VARCHAR(20) NOT NULL,
    content VARCHAR(300) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_recommendation_items_section FOREIGN KEY (recommendation_section_id) REFERENCES buying_guide_recommendation_sections (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_bg_recommendation_items_section ON buying_guide_recommendation_items (recommendation_section_id);

CREATE TABLE buying_guide_advice_sections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    buying_guide_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_advice_sections_guide FOREIGN KEY (buying_guide_id) REFERENCES buying_guides (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_bg_advice_sections_guide ON buying_guide_advice_sections (buying_guide_id);

CREATE TABLE buying_guide_faqs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    buying_guide_id BIGINT NOT NULL,
    question VARCHAR(300) NOT NULL,
    answer TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_faqs_guide FOREIGN KEY (buying_guide_id) REFERENCES buying_guides (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_bg_faqs_guide ON buying_guide_faqs (buying_guide_id);

CREATE TABLE buying_guide_section_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    buying_guide_id BIGINT NOT NULL,
    section_key VARCHAR(30) NOT NULL,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_section_settings_guide FOREIGN KEY (buying_guide_id) REFERENCES buying_guides (id) ON DELETE CASCADE,
    CONSTRAINT uq_bg_section_settings_guide_key UNIQUE (buying_guide_id, section_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
