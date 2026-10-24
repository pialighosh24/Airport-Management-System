const { describe, it } = require('node:test');
const assert = require('node:assert');
const { normalizeSymbols, fetchExchangeRates } = require('../../backend/src/services/currencyService');

describe('AeroNexus Currency Service - Open Exchange Rate API', () => {
  it('should normalize and de-duplicate symbol lists', () => {
    assert.deepStrictEqual(normalizeSymbols(['usd', 'inr', 'USD']), ['USD', 'INR']);
    assert.deepStrictEqual(normalizeSymbols('eur,gbp'), ['EUR', 'GBP']);
    assert.deepStrictEqual(normalizeSymbols([]), ['USD', 'INR']);
  });

  it('should fetch exchange rates and label them as indicative', async () => {
    const fakeFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        result: 'success',
        provider: 'open.er-api.com',
        base_code: 'USD',
        time_last_update_utc: new Date().toISOString(),
        rates: { USD: 1, INR: 84.12 },
      }),
    });

    const result = await fetchExchangeRates({ base: 'USD', symbols: ['USD', 'INR'], fetchFn: fakeFetch, forceRefresh: true });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.rates.INR, 84.12);
    assert.ok(result.disclaimer.toLowerCase().includes('indicative'));
  });

  it('should throw when the exchange rate provider reports failure', async () => {
    const fakeFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ result: 'error', error_type: 'invalid_code' }),
    });

    await assert.rejects(
      () => fetchExchangeRates({ base: 'XXX', symbols: ['USD'], fetchFn: fakeFetch, forceRefresh: true }),
      (err) => err.message.includes('invalid_code')
    );
  });
});
