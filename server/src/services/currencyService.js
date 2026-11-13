/**
 * Currency Exchange Rate Service
 * 
 * Fetches real-time foreign exchange rates (USD, INR, EUR, GBP) using a free,
 * public exchange rate API (open.er-api.com) with in-memory caching and
 * graceful offline fallback.
 * 
 * Key Principles:
 * - Transparent provenance: clearly provides exchange rate source and timestamp.
 * - Enforces an in-memory TTL cache (1 hour) to minimize unnecessary network calls.
 * - Graceful fallback: If network request fails or times out, uses cached data
 *   or trusted reference rate (84.00 USD/INR) with isLive: false.
 * - Never throws unhandled exceptions that could bring down the fare comparison.
 */

const EXCHANGE_RATE_API_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache TTL
const DEFAULT_TIMEOUT_MS = 6000; // 6 seconds timeout

// Fallback baseline reference rates (approximate market rates)
const FALLBACK_RATES = {
  USD: 1.0,
  INR: 84.00,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  SGD: 1.34,
};

let cachedRatesData = null;
let lastFetchTimestamp = 0;

/**
 * Clear the exchange rate cache (used for unit testing)
 */
function clearCurrencyCache() {
  cachedRatesData = null;
  lastFetchTimestamp = 0;
}

/**
 * Fetches latest exchange rates from open.er-api.com with caching and fallback.
 * 
 * @param {object} [options]
 * @param {boolean} [options.forceRefresh=false] Bypass cache
 * @param {Function} [options.fetchFn] Custom fetch implementation for unit tests
 * @param {number} [options.timeoutMs] Timeout in ms
 * @returns {Promise<object>} Standardized rates object
 */
async function getExchangeRates(options = {}) {
  const {
    forceRefresh = false,
    fetchFn = globalThis.fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const now = Date.now();

  // Return cached rates if fresh
  if (!forceRefresh && cachedRatesData && (now - lastFetchTimestamp < CACHE_TTL_MS)) {
    return {
      ...cachedRatesData,
      fromCache: true,
    };
  }

  // Attempt live fetch
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetchFn(EXCHANGE_RATE_API_URL, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Exchange rate provider returned HTTP ${response.status}`);
    }

    const json = await response.json();

    if (json.result === 'success' && json.rates) {
      const liveData = {
        success: true,
        isLive: true,
        base: json.base_code || 'USD',
        rates: {
          USD: 1.0,
          INR: typeof json.rates.INR === 'number' ? json.rates.INR : FALLBACK_RATES.INR,
          EUR: typeof json.rates.EUR === 'number' ? json.rates.EUR : FALLBACK_RATES.EUR,
          GBP: typeof json.rates.GBP === 'number' ? json.rates.GBP : FALLBACK_RATES.GBP,
          AED: typeof json.rates.AED === 'number' ? json.rates.AED : FALLBACK_RATES.AED,
          SGD: typeof json.rates.SGD === 'number' ? json.rates.SGD : FALLBACK_RATES.SGD,
        },
        source: 'open.er-api.com (European Central Bank / Global FX Feeds)',
        rateTimestampUtc: json.time_last_update_utc || new Date().toISOString(),
        fetchedAtUtc: new Date().toISOString(),
        fromCache: false,
      };

      cachedRatesData = liveData;
      lastFetchTimestamp = now;

      return liveData;
    }

    throw new Error('Unexpected payload structure from FX provider');
  } catch (err) {
    // If we have stale cached data, serve it with isLive: false
    if (cachedRatesData) {
      return {
        ...cachedRatesData,
        isLive: false,
        warning: `Serving cached rates due to network warning: ${err.message}`,
        fromCache: true,
      };
    }

    // Otherwise serve reference fallback
    return {
      success: true,
      isLive: false,
      base: 'USD',
      rates: FALLBACK_RATES,
      source: 'AeroNexus Offline FX Reference Table',
      rateTimestampUtc: new Date().toISOString(),
      fetchedAtUtc: new Date().toISOString(),
      fromCache: false,
      warning: `Unable to reach live FX API (${err.message}). Using reference rates.`,
    };
  }
}

/**
 * Convenience helper to convert amount from one currency to another
 * 
 * @param {number} amount Amount to convert
 * @param {string} from Source currency code ('USD', 'INR', etc.)
 * @param {string} to Target currency code ('USD', 'INR', etc.)
 * @param {object} [options] Options passed to getExchangeRates
 * @returns {Promise<{ convertedAmount: number, rate: number, source: string, timestamp: string }>}
 */
async function convertCurrency(amount, from = 'USD', to = 'INR', options = {}) {
  const ratesEnv = await getExchangeRates(options);
  const fromCode = from.toUpperCase();
  const toCode = to.toUpperCase();

  const rates = ratesEnv.rates;
  const rateFromUsd = rates[fromCode] || 1.0;
  const rateToUsd = rates[toCode] || 1.0;

  // Amount in USD = amount / rateFromUsd
  // Amount in Target = (amount / rateFromUsd) * rateToUsd
  const effectiveRate = rateToUsd / rateFromUsd;
  const converted = parseFloat((amount * effectiveRate).toFixed(2));

  return {
    originalAmount: amount,
    originalCurrency: fromCode,
    convertedAmount: converted,
    targetCurrency: toCode,
    exchangeRate: parseFloat(effectiveRate.toFixed(4)),
    source: ratesEnv.source,
    rateTimestampUtc: ratesEnv.rateTimestampUtc,
    isLive: ratesEnv.isLive,
  };
}

module.exports = {
  getExchangeRates,
  convertCurrency,
  clearCurrencyCache,
  FALLBACK_RATES,
};
