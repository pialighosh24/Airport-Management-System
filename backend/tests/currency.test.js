const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const express = require('express');

const {
  getExchangeRates,
  convertCurrency,
  clearCurrencyCache,
  FALLBACK_RATES,
} = require('../src/services/currencyService');

const fareRoutes = require('../src/routes/fareRoutes');

// Mock Express app for testing routes
const app = express();
app.use(express.json());
app.use('/api/fares', fareRoutes);

describe('Currency Exchange Rate Service & Fare Integration', () => {
  beforeEach(() => {
    clearCurrencyCache();
  });

  describe('1. Currency Service Core Functionality', () => {
    it('should return valid exchange rates with source and timestamp', async () => {
      const mockFetch = async () => ({
        ok: true,
        json: async () => ({
          result: 'success',
          base_code: 'USD',
          rates: { INR: 86.5, EUR: 0.92, GBP: 0.79 },
          time_last_update_utc: 'Wed, 16 Oct 2026 12:00:00 +0000',
        }),
      });

      const ratesEnv = await getExchangeRates({ fetchFn: mockFetch });

      assert.strictEqual(ratesEnv.success, true);
      assert.strictEqual(ratesEnv.base, 'USD');
      assert.strictEqual(typeof ratesEnv.rates.INR, 'number');
      assert.strictEqual(ratesEnv.rates.INR, 86.5);
      assert.strictEqual(ratesEnv.isLive, true);
      assert.ok(ratesEnv.source.includes('open.er-api.com'));
      assert.ok(ratesEnv.rateTimestampUtc);
    });

    it('should use in-memory cache for consecutive requests', async () => {
      let fetchCount = 0;
      const mockFetch = async () => {
        fetchCount++;
        return {
          ok: true,
          json: async () => ({
            result: 'success',
            base_code: 'USD',
            rates: { INR: 85.0 },
          }),
        };
      };

      const res1 = await getExchangeRates({ fetchFn: mockFetch });
      assert.strictEqual(fetchCount, 1);
      assert.strictEqual(res1.fromCache, false);

      const res2 = await getExchangeRates({ fetchFn: mockFetch });
      assert.strictEqual(fetchCount, 1);
      assert.strictEqual(res2.fromCache, true);
    });

    it('should gracefully degrade to fallback rates if provider network fails', async () => {
      const failingFetch = async () => {
        throw new Error('Network timeout contacting exchange rate server');
      };

      const fallbackEnv = await getExchangeRates({ fetchFn: failingFetch });

      assert.strictEqual(fallbackEnv.success, true);
      assert.strictEqual(fallbackEnv.isLive, false);
      assert.strictEqual(fallbackEnv.rates.INR, FALLBACK_RATES.INR);
      assert.ok(fallbackEnv.warning.includes('Unable to reach live FX API'));
    });

    it('should accurately convert currencies with convertCurrency helper', async () => {
      const mockFetch = async () => ({
        ok: true,
        json: async () => ({
          result: 'success',
          base_code: 'USD',
          rates: { INR: 84.0, EUR: 0.90 },
        }),
      });

      // 100 USD to INR
      const usdToInr = await convertCurrency(100, 'USD', 'INR', { fetchFn: mockFetch });
      assert.strictEqual(usdToInr.originalAmount, 100);
      assert.strictEqual(usdToInr.targetCurrency, 'INR');
      assert.strictEqual(usdToInr.convertedAmount, 8400);

      // 8400 INR to USD
      const inrToUsd = await convertCurrency(8400, 'INR', 'USD', { fetchFn: mockFetch });
      assert.strictEqual(inrToUsd.convertedAmount, 100);
    });
  });

  describe('2. Live REST Endpoints', () => {
    it('GET /api/fares/exchange-rates should return 200 with FX rates metadata', async () => {
      const res = await request(app).get('/api/fares/exchange-rates');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(typeof res.body.rates, 'object');
      assert.strictEqual(typeof res.body.rates.INR, 'number');
      assert.ok(res.body.source);
      assert.ok(res.body.rateTimestampUtc);
    });

    it('GET /api/fares should include dynamic FX rate metadata in fare search response', async () => {
      const res = await request(app).get('/api/fares?origin=DEL&destination=CCU');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(typeof res.body.fxRateUsdToInr, 'number');
      assert.ok(res.body.fxRateTimestampUtc);
      assert.ok(res.body.fxRateSource);
    });
  });
});
