-- ===================================================
-- AeroNexus MySQL 8.0 Database Schema
-- Database: aeronexus
-- ===================================================

CREATE DATABASE IF NOT EXISTS aeronexus
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE aeronexus;

-- Flights Table
-- Supports full telemetry, schedule metadata, and data freshness tracking
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
