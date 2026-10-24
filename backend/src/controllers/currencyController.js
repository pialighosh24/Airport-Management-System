/**
 * AeroNexus — Currency Controller
 *
 * Exposes indicative foreign exchange rates through a single, consistently
 * shaped REST endpoint.
 */

const { fetchExchangeRates, clearCurrencyCache } = require('../services/currencyService');

/**
 * @route   GET /api/currency
 * @desc    Get indicative exchange rates (cached)
 * @query   base     (optional) Base currency, default USD
 * @query   symbols  (optional) Comma separated ISO codes, default USD,INR
 * @query   refresh (optional) true/false, default false (uses cache)
 */
async function getCurrency(req, res) {
  try {
    const base = String(req.query.base || 'USD').toUpperCase();
    const symbols = req.query.symbols
      ? String(req.query.symbols).split(',').map((s) => s.trim().toUpperCase())
      : ['USD', 'INR'];
    const refresh = String(req.query.refresh).toLowerCase() === 'true';

    const result = await fetchExchangeRates({ base, symbols, forceRefresh: refresh });

    return res.status(200).json({
      success: true,
      source: result.source,
      providerName: result.providerName,
      base: result.base,
      baseCurrency: result.baseCurrency,
      rates: result.rates,
      updatedAtUtc: result.updatedAtUtc,
      retrievedAtUtc: result.retrievedAtUtc,
      ...(result.fromCache ? { fromCache: true } : {}),
      disclaimer: result.disclaimer,
      fromProvider: result.fromProvider,
    });
  } catch (err) {
    console.error(`❌ [Currency API Error]: ${err.message}`);
    if (err.name === 'TimeoutError') {
      return res.status(504).json({ success: false, error: 'GatewayTimeout', message: 'Currency service timed out. Please retry.' });
    }
    if (err.name === 'ExternalApiError') {
      return res.status(502).json({ success: false, error: 'BadGateway', message: `Currency provider error: ${err.message}` });
    }
    return res.status(500).json({ success: false, error: 'ServerError', message: 'Failed to retrieve exchange rates.' });
  }
}

module.exports = {
  getCurrency,
  clearCurrencyCache,
};
