-- ===================================================
-- AeroNexus MySQL 8.0 Comprehensive Database Schema
-- Database: aeronexus
-- ===================================================

CREATE DATABASE IF NOT EXISTS aeronexus
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE aeronexus;

-- ---------------------------------------------------
-- 1. Users Table (Authentication & Role-Based Access)
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role ENUM('passenger', 'staff', 'admin') NOT NULL DEFAULT 'passenger',
  staff_pin VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 2. Flights Table (Telemetry & Freshness Tracking)
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS flights (
  id INT AUTO_INCREMENT PRIMARY KEY,
  callsign VARCHAR(20) NOT NULL,
  flight_number VARCHAR(20) NOT NULL UNIQUE,
  airline_name VARCHAR(100) NOT NULL,
  airline_iata VARCHAR(10) NOT NULL,
  airline_icao VARCHAR(10) DEFAULT NULL,
  aircraft_model VARCHAR(100) DEFAULT NULL,
  registration VARCHAR(50) DEFAULT NULL,
  origin_iata VARCHAR(10) NOT NULL,
  origin_icao VARCHAR(10) DEFAULT NULL,
  origin_name VARCHAR(150) NOT NULL,
  origin_city VARCHAR(100) NOT NULL,
  origin_country VARCHAR(100) NOT NULL,
  origin_terminal VARCHAR(20) DEFAULT NULL,
  origin_gate VARCHAR(20) DEFAULT NULL,
  destination_iata VARCHAR(10) NOT NULL,
  destination_icao VARCHAR(10) DEFAULT NULL,
  destination_name VARCHAR(150) NOT NULL,
  destination_city VARCHAR(100) NOT NULL,
  destination_country VARCHAR(100) NOT NULL,
  destination_terminal VARCHAR(20) DEFAULT NULL,
  destination_gate VARCHAR(20) DEFAULT NULL,
  latitude DECIMAL(10, 6) DEFAULT NULL,
  longitude DECIMAL(10, 6) DEFAULT NULL,
  altitude_feet INT DEFAULT NULL,
  ground_speed_knots INT DEFAULT NULL,
  heading_degrees INT DEFAULT NULL,
  vertical_rate_fpm INT DEFAULT NULL,
  squawk_code VARCHAR(20) DEFAULT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'unknown',
  freshness_status VARCHAR(20) NOT NULL DEFAULT 'valid',
  observation_time_utc VARCHAR(50) NOT NULL,
  retrieval_time_utc VARCHAR(50) NOT NULL,
  age_seconds INT NOT NULL DEFAULT 0,
  provider_name VARCHAR(150) NOT NULL,
  freshness_notes TEXT DEFAULT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT TRUE,
  data_source VARCHAR(100) NOT NULL DEFAULT 'SAMPLE_DATA_PHASE_2',
  disclaimer TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_flight_number (flight_number),
  INDEX idx_callsign (callsign),
  INDEX idx_origin_iata (origin_iata),
  INDEX idx_destination_iata (destination_iata),
  INDEX idx_freshness_status (freshness_status),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 3. Disruptions Table (Staff Operations & Incident Mgmt)
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS disruptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  case_number VARCHAR(50) NOT NULL UNIQUE,
  flight_number VARCHAR(20) NOT NULL,
  route VARCHAR(50) NOT NULL,
  incident_type ENUM('weather', 'mechanical', 'air_traffic_control', 'crew_duty', 'medical', 'other') NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  impacted_passengers INT NOT NULL DEFAULT 0,
  status ENUM('open', 'investigating', 'resolved') NOT NULL DEFAULT 'open',
  reported_by VARCHAR(100) NOT NULL,
  summary TEXT NOT NULL,
  action_plan TEXT NOT NULL,
  rebooking_status ENUM('in_progress', 'completed', 'not_required') NOT NULL DEFAULT 'not_required',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_disruption_flight (flight_number),
  INDEX idx_disruption_status (status),
  INDEX idx_disruption_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 4. Flight Watchlist & Alert Preferences Table
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS flight_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_email VARCHAR(120) NOT NULL,
  flight_number VARCHAR(20) NOT NULL,
  alert_on_gate_change BOOLEAN NOT NULL DEFAULT TRUE,
  alert_on_boarding BOOLEAN NOT NULL DEFAULT TRUE,
  delay_threshold_mins INT NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_flight_alert (user_email, flight_number),
  INDEX idx_alert_email (user_email),
  INDEX idx_alert_flight (flight_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 5. Notifications Feed Table
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flight_number VARCHAR(20) NOT NULL,
  notification_type ENUM('delay', 'gate_change', 'boarding', 'disruption', 'system') NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  timestamp_utc VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_flight (flight_number),
  INDEX idx_notif_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- 6. Flight Fares Table (Zero Hidden Fees Comparison)
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS flight_fares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fare_code VARCHAR(50) NOT NULL UNIQUE,
  airline_name VARCHAR(100) NOT NULL,
  airline_code VARCHAR(10) NOT NULL,
  flight_number VARCHAR(20) NOT NULL,
  origin_iata VARCHAR(10) NOT NULL,
  destination_iata VARCHAR(10) NOT NULL,
  departure_time_utc VARCHAR(50) NOT NULL,
  arrival_time_utc VARCHAR(50) NOT NULL,
  duration_minutes INT NOT NULL,
  stops_count INT NOT NULL DEFAULT 0,
  travel_class ENUM('Economy', 'Premium Economy', 'Business') NOT NULL DEFAULT 'Economy',
  base_fare_usd DECIMAL(10, 2) NOT NULL,
  taxes_fees_usd DECIMAL(10, 2) NOT NULL,
  total_fare_usd DECIMAL(10, 2) NOT NULL,
  personal_item_included BOOLEAN NOT NULL DEFAULT TRUE,
  personal_item_rule VARCHAR(150) DEFAULT 'Fits under seat',
  cabin_bag_included BOOLEAN NOT NULL DEFAULT TRUE,
  cabin_bag_weight_kg INT DEFAULT 8,
  checked_bag_included BOOLEAN NOT NULL DEFAULT FALSE,
  checked_bag_weight_kg INT DEFAULT 23,
  extra_bag_fee_usd DECIMAL(10, 2) DEFAULT 45.00,
  cancellation_policy VARCHAR(255) NOT NULL DEFAULT 'Standard fee applies within 24h',
  available_seats INT NOT NULL DEFAULT 9,
  is_transparent_guaranteed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fare_origin (origin_iata),
  INDEX idx_fare_dest (destination_iata),
  INDEX idx_fare_price (total_fare_usd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
