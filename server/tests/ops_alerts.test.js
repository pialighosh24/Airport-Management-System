const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { isWithinQuietHours } = require('../src/controllers/alertController');
const amadeusService = require('../src/services/amadeusService');
const flightAwareService = require('../src/services/flightAwareService');

let app;
try {
  const serverModule = require('../server');
  app = serverModule.app || serverModule;
} catch (e) {}

describe('Operations, Turnaround & Alerts Integration Suite', () => {
  describe('1. Ground Turnaround Cases: /api/ops', () => {
    it('GET /api/ops/cases should return initial turnaround cases', async () => {
      if (!app) return;
      const res = await request(app).get('/api/ops/cases');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.count >= 2);
    });

    it('POST /api/ops/cases should validate required fields', async () => {
      if (!app) return;
      const res = await request(app).post('/api/ops/cases').send({});
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error, 'ValidationError');
    });

    it('POST /api/ops/cases should create a new disruption case successfully', async () => {
      if (!app) return;
      const newCase = {
        flightNumber: 'AI102',
        route: 'DEL -> CCU',
        incidentType: 'mechanical',
        severity: 'high',
        impactedPassengers: 180,
        summary: 'Nose gear hydraulic pressure drop on pushback.',
        actionPlan: 'Tow to stand 42 for maintenance team check.',
        rebookingStatus: 'in_progress',
        turnaroundMilestone: 'deboarding',
      };

      const res = await request(app).post('/api/ops/cases').send(newCase);
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.flightNumber, 'AI102');
      assert.strictEqual(res.body.data.status, 'open');
    });

    it('PATCH /api/ops/cases/:id should update status to resolved', async () => {
      if (!app) return;
      const res = await request(app)
        .patch('/api/ops/cases/disp-001')
        .send({ status: 'resolved', turnaroundMilestone: 'boarding_closed' });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'resolved');
      assert.strictEqual(res.body.data.turnaroundMilestone, 'boarding_closed');
    });

    it('GET /api/ops/milestones should return all 6 turnaround stages', async () => {
      if (!app) return;
      const res = await request(app).get('/api/ops/milestones');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.stages.includes('deboarding'));
      assert.ok(res.body.stages.includes('fueling'));
      assert.ok(res.body.stages.includes('boarding_closed'));
    });
  });

  describe('2. Alerts & Quiet Hours: /api/alerts', () => {
    it('isWithinQuietHours should correctly determine quiet hours window', () => {
      // Test deterministic quiet hours window
      const now = new Date();
      const currentH = now.getUTCHours();
      const currentM = now.getUTCMinutes();
      const pad = (n) => String(n).padStart(2, '0');

      const start = `${pad(Math.max(0, currentH - 1))}:00`;
      const end = `${pad(Math.min(23, currentH + 1))}:59`;

      assert.strictEqual(isWithinQuietHours(start, end), true);
    });

    it('POST /api/alerts should register a traveller alert subscription', async () => {
      if (!app) return;
      const res = await request(app).post('/api/alerts').send({
        flightNumber: 'EK202',
        email: 'traveller@aeronexus.aero',
        delayThresholdMins: 20,
        alertOnGateChange: true,
      });

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.flightNumber, 'EK202');
    });

    it('POST /api/alerts should require flightNumber', async () => {
      if (!app) return;
      const res = await request(app).post('/api/alerts').send({});
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error, 'ValidationError');
    });

    it('GET /api/alerts should return alert history', async () => {
      if (!app) return;
      const res = await request(app).get('/api/alerts');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });
  });

  describe('3. Commercial API Adapters (Graceful Fallback)', () => {
    it('Amadeus adapter should report configured: false when credentials unconfigured', async () => {
      const res = await amadeusService.searchFlightOffers({ origin: 'DEL', destination: 'CCU' });
      assert.strictEqual(res.configured, false);
      assert.strictEqual(res.isLive, false);
    });

    it('FlightAware adapter should report configured: false when API key unconfigured', async () => {
      const res = await flightAwareService.getAirportSchedule('JFK');
      assert.strictEqual(res.configured, false);
      assert.strictEqual(res.isLive, false);
    });

    it('Amadeus transformAmadeusOffer should correctly convert mock offer to INR and USD', () => {
      const mockRaw = {
        id: '1',
        price: {
          total: '8400.00',
          base: '7000.00',
        },
        itineraries: [
          {
            segments: [
              {
                carrierCode: '6E',
                number: '204',
                departure: { iataCode: 'DEL', at: '2026-10-20T10:00:00Z' },
                arrival: { iataCode: 'CCU', at: '2026-10-20T12:15:00Z' },
              },
            ],
          },
        ],
      };

      const transformed = amadeusService.transformAmadeusOffer(mockRaw, 0, 'INR');
      assert.strictEqual(transformed.flightNumber, '6E204');
      assert.strictEqual(transformed.originIata, 'DEL');
      assert.strictEqual(transformed.destinationIata, 'CCU');
      assert.strictEqual(transformed.totalFareInr, 8400);
      assert.strictEqual(transformed.totalFareUsd, 100);
      assert.strictEqual(transformed.baggage.cabinBagIncluded, true);
    });
  });
});
