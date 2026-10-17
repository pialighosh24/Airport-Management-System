const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const express = require('express');

const {
  getAllMasterAirports,
  getAirportByCode,
  searchMasterAirports,
  getMasterHubs,
} = require('../src/services/airportMasterService');

const airportRoutes = require('../src/routes/airportRoutes');

// Mock Express app
const app = express();
app.use(express.json());
app.use('/api/airports', airportRoutes);

describe('Airport Master Dataset Integration', () => {
  describe('1. Airport Master Service Core Functions', () => {
    it('getAllMasterAirports should return full dataset with mandatory aviation fields', () => {
      const airports = getAllMasterAirports();
      assert.ok(airports.length >= 50, 'Master dataset must contain at least 50 airports');

      for (const apt of airports) {
        assert.ok(apt.iata, 'Every airport must have an IATA code');
        assert.ok(apt.icao, 'Every airport must have an ICAO code');
        assert.ok(apt.name, 'Every airport must have a name');
        assert.ok(typeof apt.latitude === 'number', 'Airport latitude must be numeric');
        assert.ok(typeof apt.longitude === 'number', 'Airport longitude must be numeric');
        assert.ok(apt.timezone, 'Airport timezone must be specified');
        assert.ok(apt.country, 'Airport country must be specified');
      }
    });

    it('getAllMasterAirports should support filtering by country code', () => {
      const indianAirports = getAllMasterAirports({ countryCode: 'IN' });
      assert.ok(indianAirports.length >= 15);
      assert.ok(indianAirports.every((a) => a.countryCode === 'IN'));
      assert.ok(indianAirports.some((a) => a.iata === 'CCU'));
      assert.ok(indianAirports.some((a) => a.iata === 'DEL'));
    });

    it('getAirportByCode should look up by IATA or ICAO with case insensitivity', () => {
      const ccu = getAirportByCode('ccu');
      assert.strictEqual(ccu.iata, 'CCU');
      assert.strictEqual(ccu.icao, 'VECC');
      assert.strictEqual(ccu.city, 'Kolkata');
      assert.strictEqual(ccu.timezone, 'Asia/Kolkata');

      const vidp = getAirportByCode('vidp');
      assert.strictEqual(vidp.iata, 'DEL');
      assert.strictEqual(vidp.city, 'Delhi');

      const unknown = getAirportByCode('ZZZ999');
      assert.strictEqual(unknown, null);
    });

    it('searchMasterAirports should find airports by name or municipality', () => {
      const kolkataResults = searchMasterAirports('Kolkata');
      assert.ok(kolkataResults.length > 0);
      assert.strictEqual(kolkataResults[0].iata, 'CCU');

      const londonResults = searchMasterAirports('London');
      assert.ok(londonResults.some((a) => a.iata === 'LHR'));
      assert.ok(londonResults.some((a) => a.iata === 'LGW'));
    });
  });

  describe('2. Live API Routes Integration', () => {
    it('GET /api/airports/master should return 200 with master airport list', async () => {
      const res = await request(app).get('/api/airports/master');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.count >= 50);
      assert.strictEqual(res.body.source, 'AeroNexus Airport Master Dataset');
    });

    it('GET /api/airports/master?country=IN should filter by country', async () => {
      const res = await request(app).get('/api/airports/master?country=IN');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.every((a) => a.countryCode === 'IN'));
    });

    it('GET /api/airports/:code should return CCU airport from master dataset', async () => {
      const res = await request(app).get('/api/airports/CCU');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.iata, 'CCU');
      assert.strictEqual(res.body.data.icao, 'VECC');
    });
  });
});
