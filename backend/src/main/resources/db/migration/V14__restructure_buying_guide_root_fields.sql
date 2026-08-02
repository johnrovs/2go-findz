ALTER TABLE buying_guides
    CHANGE COLUMN content introduction TEXT NOT NULL,
    ADD COLUMN slug VARCHAR(220) NULL AFTER title,
    ADD COLUMN category_id BIGINT NULL,
    ADD COLUMN seo_title VARCHAR(70) NULL,
    ADD COLUMN seo_description VARCHAR(200) NULL,
    ADD COLUMN scheduled_publish_at TIMESTAMP NULL;

-- Backfill slugs for any existing rows before enforcing NOT NULL + UNIQUE.
UPDATE buying_guides
SET slug = TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9]+', '-')))
WHERE slug IS NULL;

-- Resolve any collisions the backfill above could have produced by appending the row's id.
UPDATE buying_guides bg
JOIN (
    SELECT slug FROM buying_guides GROUP BY slug HAVING COUNT(*) > 1
) dup ON bg.slug = dup.slug
SET bg.slug = CONCAT(bg.slug, '-', bg.id);

ALTER TABLE buying_guides
    MODIFY COLUMN slug VARCHAR(220) NOT NULL,
    ADD CONSTRAINT uq_buying_guides_slug UNIQUE (slug),
    ADD CONSTRAINT fk_buying_guides_category FOREIGN KEY (category_id) REFERENCES product_categories (id);
