const { getPool } = require('../config/database');

/**
 * AeroNexus Flight Model (MySQL 8.0)
 * 
 * Core Principle Implemented:
 * "Unknown stays unknown. Never invent flight information or display stale data as current.
 * Distinguish valid, stale, missing, and unavailable data."
 * 
 * Provides:
 * - Table creation DDL
 * - Parameterized SQL queries for safety against SQL injection
 * - Mapping between MySQL relational schema and client telemetry object representation
 */

const CREATE_TABLE_SQL = `
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
`;

/**
 * Transforms a MySQL database row into the exact telemetry JSON structure expected by the client.
 */
function mapRowToFlight(row) {
  if (!row) return null;

  return {
    callsign: row.callsign,
    flightNumber: row.flight_number,
    airline: {
      name: row.airline_name,
      iata: row.airline_iata,
      icao: row.airline_icao || null,
    },
    aircraftModel: row.aircraft_model || null,
    registration: row.registration || null,
    origin: {
      iata: row.origin_iata,
      icao: row.origin_icao || null,
      name: row.origin_name,
      city: row.origin_city,
      country: row.origin_country,
      terminal: row.origin_terminal || null,
      gate: row.origin_gate || null,
    },
    destination: {
      iata: row.destination_iata,
      icao: row.destination_icao || null,
      name: row.destination_name,
      city: row.destination_city,
      country: row.destination_country,
      terminal: row.destination_terminal || null,
      gate: row.destination_gate || null,
    },
    latitude: row.latitude !== null && row.latitude !== undefined ? parseFloat(row.latitude) : null,
    longitude: row.longitude !== null && row.longitude !== undefined ? parseFloat(row.longitude) : null,
    altitudeFeet: row.altitude_feet !== null && row.altitude_feet !== undefined ? parseInt(row.altitude_feet, 10) : null,
    groundSpeedKnots: row.ground_speed_knots !== null && row.ground_speed_knots !== undefined ? parseInt(row.ground_speed_knots, 10) : null,
    headingDegrees: row.heading_degrees !== null && row.heading_degrees !== undefined ? parseInt(row.heading_degrees, 10) : null,
    verticalRateFpm: row.vertical_rate_fpm !== null && row.vertical_rate_fpm !== undefined ? parseInt(row.vertical_rate_fpm, 10) : null,
    squawkCode: row.squawk_code || null,
    status: row.status,
    freshness: {
      status: row.freshness_status,
      observationTimeUtc: row.observation_time_utc,
      retrievalTimeUtc: row.retrieval_time_utc,
      ageSeconds: parseInt(row.age_seconds, 10) || 0,
      providerName: row.provider_name,
      notes: row.freshness_notes || null,
    },
    isDemo: Boolean(row.is_demo),
    dataSource: row.data_source,
    disclaimer: row.disclaimer || null,
  };
}

/**
 * Extracts parameterized values from a flight object for SQL insert
 */
function flightToRowParams(flight) {
  return [
    flight.callsign,
    flight.flightNumber,
    flight.airline?.name || 'Unknown Airline',
    flight.airline?.iata || 'XX',
    flight.airline?.icao || null,
    flight.aircraftModel || null,
    flight.registration || null,
    flight.origin?.iata || 'N/A',
    flight.origin?.icao || null,
    flight.origin?.name || 'Unknown Airport',
    flight.origin?.city || 'Unknown City',
    flight.origin?.country || 'Unknown Country',
    flight.origin?.terminal || null,
    flight.origin?.gate || null,
    flight.destination?.iata || 'N/A',
    flight.destination?.icao || null,
    flight.destination?.name || 'Unknown Airport',
    flight.destination?.city || 'Unknown City',
    flight.destination?.country || 'Unknown Country',
    flight.destination?.terminal || null,
    flight.destination?.gate || null,
    flight.latitude !== null && flight.latitude !== undefined ? flight.latitude : null,
    flight.longitude !== null && flight.longitude !== undefined ? flight.longitude : null,
    flight.altitudeFeet !== null && flight.altitudeFeet !== undefined ? flight.altitudeFeet : null,
    flight.groundSpeedKnots !== null && flight.groundSpeedKnots !== undefined ? flight.groundSpeedKnots : null,
    flight.headingDegrees !== null && flight.headingDegrees !== undefined ? flight.headingDegrees : null,
    flight.verticalRateFpm !== null && flight.verticalRateFpm !== undefined ? flight.verticalRateFpm : null,
    flight.squawkCode || null,
    flight.status || 'unknown',
    flight.freshness?.status || 'valid',
    flight.freshness?.observationTimeUtc || new Date().toISOString(),
    flight.freshness?.retrievalTimeUtc || new Date().toISOString(),
    flight.freshness?.ageSeconds !== undefined ? flight.freshness.ageSeconds : 0,
    flight.freshness?.providerName || 'Simulated Feed',
    flight.freshness?.notes || null,
    flight.isDemo !== false ? 1 : 0,
    flight.dataSource || 'SAMPLE_DATA_PHASE_2',
    flight.disclaimer || null,
  ];
}

const INSERT_COLUMNS = `
  callsign, flight_number, airline_name, airline_iata, airline_icao,
  aircraft_model, registration, origin_iata, origin_icao, origin_name,
  origin_city, origin_country, origin_terminal, origin_gate,
  destination_iata, destination_icao, destination_name, destination_city,
  destination_country, destination_terminal, destination_gate,
  latitude, longitude, altitude_feet, ground_speed_knots,
  heading_degrees, vertical_rate_fpm, squawk_code, status,
  freshness_status, observation_time_utc, retrieval_time_utc, age_seconds,
  provider_name, freshness_notes, is_demo, data_source, disclaimer
`;

const INSERT_PLACEHOLDERS = Array(38).fill('?').join(', ');

const Flight = {
  // Schema path descriptors for test validation and introspection
  schema: {
    tableName: 'flights',
    paths: {
      flightNumber: { type: 'String', column: 'flight_number', required: true, unique: true },
      callsign: { type: 'String', column: 'callsign', required: true },
      status: { type: 'String', column: 'status', required: true },
      isDemo: { type: 'Boolean', column: 'is_demo', default: true },
      dataSource: { type: 'String', column: 'data_source', default: 'SAMPLE_DATA_PHASE_2' },
      disclaimer: { type: 'String', column: 'disclaimer' },
    },
    path(name) {
      const fieldMap = {
        origin: { column: 'origin_iata' },
        'origin.iata': { column: 'origin_iata' },
        destination: { column: 'destination_iata' },
        'destination.iata': { column: 'destination_iata' },
        'freshness.status': { column: 'freshness_status' },
      };
      return fieldMap[name] || this.paths[name] || null;
    },
  },

  mapRowToFlight,
  flightToRowParams,

  /**
   * Ensures the MySQL table exists
   */
  async createTableIfNotExists(customPool) {
    const p = customPool || getPool();
    if (!p) throw new Error('Database pool not available');
    await p.query(CREATE_TABLE_SQL);
  },

  /**
   * Counts total records in the flights table
   */
  async countDocuments(query = {}, customPool) {
    const p = customPool || getPool();
    if (!p) return 0;
    const [rows] = await p.query('SELECT COUNT(*) AS total FROM flights');
    return rows[0] ? rows[0].total : 0;
  },

  /**
   * Finds flights matching optional filters
   */
  async find(filters = {}, customPool) {
    const p = customPool || getPool();
    if (!p) return [];

    let sql = 'SELECT * FROM flights WHERE 1=1';
    const params = [];

    if (filters['freshness.status']) {
      sql += ' AND freshness_status = ?';
      params.push(filters['freshness.status'].toLowerCase());
    }
    if (filters['origin.iata']) {
      sql += ' AND origin_iata = ?';
      params.push(filters['origin.iata'].toUpperCase());
    }
    if (filters['destination.iata']) {
      sql += ' AND destination_iata = ?';
      params.push(filters['destination.iata'].toUpperCase());
    }

    sql += ' ORDER BY id ASC';

    const [rows] = await p.query(sql, params);
    return rows.map(mapRowToFlight);
  },

  /**
   * Finds a single flight by flight number or callsign
   */
  async findOne(query = {}, customPool) {
    const p = customPool || getPool();
    if (!p) return null;

    if (query.$or && Array.isArray(query.$or)) {
      const flightNumber = query.$or.find((c) => c.flightNumber)?.flightNumber;
      const callsign = query.$or.find((c) => c.callsign)?.callsign;

      const sql = 'SELECT * FROM flights WHERE flight_number = ? OR callsign = ? LIMIT 1';
      const [rows] = await p.query(sql, [flightNumber || '', callsign || '']);
      return rows.length > 0 ? mapRowToFlight(rows[0]) : null;
    }

    if (query.flightNumber) {
      const sql = 'SELECT * FROM flights WHERE flight_number = ? LIMIT 1';
      const [rows] = await p.query(sql, [query.flightNumber]);
      return rows.length > 0 ? mapRowToFlight(rows[0]) : null;
    }

    return null;
  },

  /**
   * Inserts a single flight using parameterized query
   */
  async insertOne(flight, customPool) {
    const p = customPool || getPool();
    if (!p) throw new Error('Database pool not available');

    const params = flightToRowParams(flight);
    const sql = `
      INSERT INTO flights (${INSERT_COLUMNS})
      VALUES (${INSERT_PLACEHOLDERS})
      ON DUPLICATE KEY UPDATE
        callsign = VALUES(callsign),
        airline_name = VALUES(airline_name),
        airline_iata = VALUES(airline_iata),
        airline_icao = VALUES(airline_icao),
        aircraft_model = VALUES(aircraft_model),
        registration = VALUES(registration),
        origin_iata = VALUES(origin_iata),
        origin_icao = VALUES(origin_icao),
        origin_name = VALUES(origin_name),
        origin_city = VALUES(origin_city),
        origin_country = VALUES(origin_country),
        origin_terminal = VALUES(origin_terminal),
        origin_gate = VALUES(origin_gate),
        destination_iata = VALUES(destination_iata),
        destination_icao = VALUES(destination_icao),
        destination_name = VALUES(destination_name),
        destination_city = VALUES(destination_city),
        destination_country = VALUES(destination_country),
        destination_terminal = VALUES(destination_terminal),
        destination_gate = VALUES(destination_gate),
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        altitude_feet = VALUES(altitude_feet),
        ground_speed_knots = VALUES(ground_speed_knots),
        heading_degrees = VALUES(heading_degrees),
        vertical_rate_fpm = VALUES(vertical_rate_fpm),
        squawk_code = VALUES(squawk_code),
        status = VALUES(status),
        freshness_status = VALUES(freshness_status),
        observation_time_utc = VALUES(observation_time_utc),
        retrieval_time_utc = VALUES(retrieval_time_utc),
        age_seconds = VALUES(age_seconds),
        provider_name = VALUES(provider_name),
        freshness_notes = VALUES(freshness_notes),
        is_demo = VALUES(is_demo),
        data_source = VALUES(data_source),
        disclaimer = VALUES(disclaimer)
    `;

    const [result] = await p.query(sql, params);
    return result;
  },

  /**
   * Inserts multiple flights in sequence
   */
  async insertMany(flights, customPool) {
    const p = customPool || getPool();
    if (!p) throw new Error('Database pool not available');

    const inserted = [];
    for (const flight of flights) {
      await this.insertOne(flight, p);
      inserted.push(flight);
    }
    return inserted;
  },

  /**
   * Deletes demo records
   */
  async deleteMany(filter = {}, customPool) {
    const p = customPool || getPool();
    if (!p) return { deletedCount: 0 };

    let sql = 'DELETE FROM flights WHERE 1=1';
    const params = [];

    if (filter.isDemo !== undefined) {
      sql += ' AND is_demo = ?';
      params.push(filter.isDemo ? 1 : 0);
    }

    const [result] = await p.query(sql, params);
    return { deletedCount: result.affectedRows };
  },

  /**
   * Fetches available flight numbers for 404 hints
   */
  async getAvailableFlightNumbers(limit = 10, customPool) {
    const p = customPool || getPool();
    if (!p) return [];

    const [rows] = await p.query('SELECT flight_number FROM flights LIMIT ?', [limit]);
    return rows.map((r) => r.flight_number);
  },
};

module.exports = Flight;
