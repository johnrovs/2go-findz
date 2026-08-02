ALTER TABLE products
    ADD COLUMN sku VARCHAR(64) NULL,
    ADD UNIQUE INDEX uq_products_sku (sku);
