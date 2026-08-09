-- Only updates the seeded default; leaves any real admin-customized headline untouched.
UPDATE system_settings
SET hero_headline = 'Smart Finds. Better Choices.'
WHERE id = 1 AND hero_headline = 'Smart Finds. Better Buys. All in One Place.';
