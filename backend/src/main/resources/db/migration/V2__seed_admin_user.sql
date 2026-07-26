-- Default administrator seed account.
-- SECURITY: change this password immediately after first login.
-- password_hash below is BCrypt("admin123", cost 10) — verified locally before
-- being committed. Never store, log, or return the plain-text password.
INSERT INTO users (id, full_name, username, password_hash, role, active)
VALUES (
    1,
    'John Rommel Rovero',
    'johnrovs',
    '$2b$10$tM2h7DKPfVcUWE19PFgg/O5xAG5i5RPvROYskHOR922jpPK2bXeY.',
    'ADMIN',
    TRUE
);
