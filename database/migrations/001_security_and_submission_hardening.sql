-- Apply once to databases created before auth-versioned sessions and
-- price-on-request property submissions were introduced.
USE landline_properties;

ALTER TABLE users
  ADD COLUMN auth_version INT UNSIGNED NOT NULL DEFAULT 0 AFTER is_active;

ALTER TABLE properties
  MODIFY COLUMN price DECIMAL(15,2) NULL;
