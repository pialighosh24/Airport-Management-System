/**
 * Airport Master Data Service
 * 
 * Provides instantaneous, zero-latency access to the AeroNexus Airport Master Dataset.
 * Contains validated names, IATA codes, ICAO codes, coordinates, elevations, and timezones
 * for 60+ major world hubs and key Indian airports.
 * 
 * Key Principles:
 * - Operates completely offline with 0 network latency.
 * - Free of third-party API dependencies or quotas.
 * - Clean separation: keeps airport master data distinct from flight and telemetry providers.
 * - Used as immediate lookup and guaranteed fallback for airport search.
 */

const MASTER_AIRPORTS = require('../data/airportsMaster.json');

// Pre-indexed map for O(1) lookups by IATA and ICAO
const byIataMap = new Map();
const byIcaoMap = new Map();

for (const apt of MASTER_AIRPORTS) {
  if (apt.iata) byIataMap.set(apt.iata.toUpperCase(), apt);
  if (apt.icao) byIcaoMap.set(apt.icao.toUpperCase(), apt);
}

/**
 * Get all airports in the master dataset
 * 
 * @param {object} [options]
 * @param {string} [options.countryCode] Filter by 2-letter country code (e.g. 'IN', 'US')
 * @returns {Array<object>}
 */
function getAllMasterAirports(options = {}) {
  const { countryCode } = options;
  if (countryCode && typeof countryCode === 'string') {
    const code = countryCode.trim().toUpperCase();
    return MASTER_AIRPORTS.filter((apt) => apt.countryCode === code);
  }
  return [...MASTER_AIRPORTS];
}

/**
 * Retrieve a single airport by its IATA or ICAO code
 * 
 * @param {string} code 3-letter IATA (e.g. 'DEL') or 4-letter ICAO (e.g. 'VIDP')
 * @returns {object|null}
 */
function getAirportByCode(code) {
  if (!code || typeof code !== 'string') return null;
  const clean = code.trim().toUpperCase();
  return byIataMap.get(clean) || byIcaoMap.get(clean) || null;
}

/**
 * Search master airports by IATA, ICAO, municipality/city, or airport name
 * 
 * @param {string} query Search string (e.g. 'Kolkata', 'CCU', 'Heathrow')
 * @param {number} [limit=20] Max results to return
 * @returns {Array<object>}
 */
function searchMasterAirports(query, limit = 20) {
  if (!query || typeof query !== 'string') return [];
  const q = query.trim().toUpperCase();
  if (q.length === 0) return [];

  // Exact IATA match gets top priority
  const exact = byIataMap.get(q) || byIcaoMap.get(q);
  const results = [];
  if (exact) {
    results.push(exact);
  }

  // Substring matches across name, city, country, region
  for (const apt of MASTER_AIRPORTS) {
    if (exact && (apt.iata === exact.iata)) continue;

    const matchesName = apt.name && apt.name.toUpperCase().includes(q);
    const matchesCity = apt.city && apt.city.toUpperCase().includes(q);
    const matchesCountry = apt.country && apt.country.toUpperCase().includes(q);
    const matchesRegion = apt.region && apt.region.toUpperCase().includes(q);

    if (matchesName || matchesCity || matchesCountry || matchesRegion) {
      results.push(apt);
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Get curated major hub airports for the home/airports directory
 */
function getMasterHubs() {
  const hubCodes = ['CCU', 'DEL', 'BOM', 'BLR', 'MAA', 'HYD', 'JFK', 'LHR', 'DXB', 'SIN', 'FRA', 'CDG', 'HND'];
  return hubCodes.map((code) => byIataMap.get(code)).filter(Boolean);
}

module.exports = {
  getAllMasterAirports,
  getAirportByCode,
  searchMasterAirports,
  getMasterHubs,
  MASTER_AIRPORTS,
};
