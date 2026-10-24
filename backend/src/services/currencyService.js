/**
 * AeroNexus — Open Exchange Rate Service
 *
 * Fetches indicative foreign exchange rates from the Open ER-API
 * (https://open.er-api.com/v6/latest/USD). Responses are cached server-side and
 * every payload carries explicit source / freshness metadata. Rates are
 * labelled as indicative and must never be presented as guaranteed transaction
 * rates.
 */

const OPEN_ER_API_BASE_URL = 'https://open.er-api.com/v6';
const DEFAULT_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;

const currencyCache = new Map();

function clearCurrencyCache() {
  currencyCache.clear();
}

function normalizeSymbols(symbols) {
  const requested = Array.isArray(symbols)
    ? symbols
    : typeof symbols === 'string'
      ? symbols.split(',')
      : ['USD', 'INR'];

  const cleaned = [...new Set(requested.map((s) => String(s).trim().toUpperCase()).filter(Boolean))];
  const allowed = ['USD', 'INR', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY', 'CNY', 'CHF'];
  const finalSymbols = cleaned.filter((s) => allowed.includes(s)).slice(0, 10);
  if (finalSymbols.length === 0) return ['USD', 'INR'];
  return finalSymbols;
}

async function fetchExchangeRates(options = {}) {
  const {
    base = 'USD',
    symbols = ['USD', 'INR'],
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchFn = globalThis.fetch,
    forceRefresh = false,
  } = options;

  const cacheKey = `${base.toUpperCase()}::${normalizeSymbols(symbols).join(',')}`;
  const now = Date.now();

  if (!forceRefresh && currencyCache.has(cacheKey)) {
    const entry = currencyCache.get(cacheKey);
    if (now - entry.cachedAt < CACHE_TTL_MS) {
      return { ...entry.payload, fromCache: true };
    }
    currencyCache.delete(cacheKey);
  }

  const url = new URL(`${OPEN_ER_API_BASE_URL}/latest/${String(base).toUpperCase()}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AeroNexus-CurrencyService/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = new Error(`Open Exchange Rate API returned HTTP ${response.status} (${response.statusText || 'Error'})`);
      err.name = 'ExternalApiError';
      err.statusCode = response.status;
      throw err;
    }

    const payload = await response.json();

    if (!payload || payload.result !== 'success') {
      const err = new Error(payload?.error_type || 'Exchange rate provider returned an unsuccessful payload.');
      err.name = 'ExternalApiError';
      throw err;
    }

    const rates = {};
    const wanted = normalizeSymbols(symbols);
    for (const symbol of wanted) {
      rates[symbol] = typeof payload.rates?.[symbol] === 'number' ? payload.rates[symbol] : null;
    }

    const result = {
      success: true,
      source: 'OPEN_ER_API',
      providerName: 'Open Exchange Rate API',
      base,
      baseCurrency: payload.base_code || base,
      rates,
      updatedAtUtc: payload.time_last_update_utc ? new Date(payload.time_last_update_utc).toISOString() : new Date().toISOString(),
      retrievedAtUtc: new Date().toISOString(),
      disclaimer:
        'Indicative exchange rates refreshed from the public Open Exchange Rate API. Rates are not guaranteed transaction rates and may differ from live market prices.',
      fromProvider: payload.provider || 'open.er-api.com',
    };

    if (currencyCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = currencyCache.keys().next().value;
      if (oldestKey) currencyCache.delete(oldestKey);
    }
    currencyCache.set(cacheKey, { payload: result, cachedAt: now });

    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Open Exchange Rate API request timed out (${Math.round(timeoutMs / 1000)}s).`);
      timeoutErr.name = 'TimeoutError';
      throw timeoutErr;
    }
    throw err;
  }
}

module.exports = {
  OPEN_ER_API_BASE_URL,
  currencyCache,
  clearCurrencyCache,
  normalizeSymbols,
  fetchExchangeRates,
};
