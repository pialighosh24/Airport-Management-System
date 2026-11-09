-- AeroNexus — Additive migration: operational airports table
-- Prepared during the Final Release Readiness closure. NOT executed against the
-- live database during this mission; requires a separate explicit authorization.

CREATE TABLE IF NOT EXISTS airports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  timezone VARCHAR(64) DEFAULT NULL,
  latitude DECIMAL(10, 6) DEFAULT NULL,
  longitude DECIMAL(10, 6) DEFAULT NULL,
  kind VARCHAR(50) NOT NULL DEFAULT 'airport',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_airport_code (code),
  INDEX idx_airport_city (city),
  INDEX idx_airport_country (country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
