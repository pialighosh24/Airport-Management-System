/**
 * Airport Model
 *
 * Operational airport records managed through the Admin Panel. The table DDL
 * is prepared in `src/config/migrations/20261109_add_airports.sql`; it has not
 * been executed against the live database during the finishing mission and must
 * only be applied through an explicitly authorized migration run.
 */

const { getPool, isDatabaseConnected } = require('../config/database');

const CREATE_TABLE_SQL = `
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
`;

function mapRowToAirport(row) {
  if (!row) return null;

  return {
    code: row.code,
    name: row.name,
    city: row.city,
    country: row.country,
    timezone: row.timezone || null,
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
    kind: row.kind || 'airport',
  };
}

function airportToRowParams(airport) {
  return [
    String(airport.code || '').toUpperCase(),
    String(airport.name || ''),
    String(airport.city || ''),
    String(airport.country || ''),
    airport.timezone || null,
    airport.latitude !== undefined && airport.latitude !== null ? Number(airport.latitude) : null,
    airport.longitude !== undefined && airport.longitude !== null ? Number(airport.longitude) : null,
    airport.kind || 'airport',
  ];
}

const Airport = {
  async createTableIfNotExists(customPool) {
    const p = customPool || getPool();
    if (!p) return false;
    await p.query(CREATE_TABLE_SQL);
    return true;
  },

  async find(filters = {}, customPool) {
    const p = customPool || getPool();
    if (!p) return [];

    let sql = 'SELECT * FROM airports WHERE 1=1';
    const params = [];

    if (filters.code) {
      sql += ' AND code = ?';
      params.push(String(filters.code).toUpperCase());
    }
    if (filters.city) {
      sql += ' AND city = ?';
      params.push(String(filters.city));
    }
    if (filters.country) {
      sql += ' AND country = ?';
      params.push(String(filters.country));
    }

    sql += ' ORDER BY code ASC';
    const [rows] = await p.query(sql, params);
    return rows.map(mapRowToAirport);
  },

  async findOne(query = {}, customPool) {
    const p = customPool || getPool();
    if (!p) return null;

    const params = [];
    let sql = 'SELECT * FROM airports WHERE 1=1';
    if (query.code) {
      sql += ' AND code = ?';
      params.push(String(query.code).toUpperCase());
    }

    const [rows] = await p.query(sql, params);
    return mapRowToAirport(rows[0] || null);
  },

  async create(airport, customPool) {
    const p = customPool || getPool();
    if (!p) return null;

    const values = airportToRowParams(airport);
    const [result] = await p.query(
      'INSERT INTO airports (code, name, city, country, timezone, latitude, longitude, kind) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      values
    );
    const created = await this.findOne({ code: values[0] }, customPool);
    return created;
  },

  async update(identifier, updates, customPool) {
    const p = customPool || getPool();
    if (!p) return null;

    const existing = await this.findOne({ code: String(identifier).toUpperCase() }, customPool);
    if (!existing) return null;

    const values = airportToRowParams({ ...existing, ...updates, code: String(identifier).toUpperCase() });
    const [result] = await p.query(
      'UPDATE airports SET code = ?, name = ?, city = ?, country = ?, timezone = ?, latitude = ?, longitude = ?, kind = ? WHERE code = ?',
      [...values, String(identifier).toUpperCase()]
    );
    const updated = await this.findOne({ code: String(identifier).toUpperCase() }, customPool);
    return updated;
  },

  async delete(identifier, customPool) {
    const p = customPool || getPool();
    if (!p) return { deletedCount: 0 };

    const code = String(identifier).toUpperCase();
    const existing = await this.findOne({ code }, customPool);
    if (!existing) return { deletedCount: 0 };

    const [result] = await p.query('DELETE FROM airports WHERE code = ?', [code]);
    return { deletedCount: result.affectedRows };
  },
};

module.exports = Airport;
