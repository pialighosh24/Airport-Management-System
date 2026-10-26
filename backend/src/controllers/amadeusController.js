/**
 * AeroNexus — Amadeus Flight Offers Controller
 *
 * Exposes the Amadeus Flight Offers Search integration through:
 * GET /api/flights/search?origin=&destination=&departureDate=&returnDate=&adults=&cabinClass=
 *
 * Response contract is intentionally consistent with the other AeroNexus
 * integration endpoints (success / source / data / error / disclaimer).
 */

const { getFlightOffers } = require('../services/amadeusService');

const DEFAULT_ADULTS = 1;

/**
 * @route   GET /api/flights/search
 * @desc    Search flight offers via Amadeus
 */
async function getFlightOffersHandler(req, res) {
  try {
    const { origin, destination, departureDate, returnDate, adults, cabinClass } = req.query;

    const normalizedOrigin = origin ? String(origin).trim().toUpperCase() : '';
    const normalizedDestination = destination ? String(destination).trim().toUpperCase() : '';
    const normalizedDepartureDate = departureDate ? String(departureDate).trim() : '';
    const normalizedReturnDate = returnDate ? String(returnDate).trim() : null;
    const normalizedAdults = adults ? Number(adults) : DEFAULT_ADULTS;
    const normalizedCabinClass = cabinClass ? String(cabinClass).trim() : null;

    const result = await getFlightOffers({
      origin: normalizedOrigin,
      destination: normalizedDestination,
      departureDate: normalizedDepartureDate,
      returnDate: normalizedReturnDate,
      adults: normalizedAdults,
      cabinClass: normalizedCabinClass,
    });

    return res.status(200).json({
      success: result.success,
      source: result.source,
      providerName: result.providerName,
      ...(result.success ? { offers: result.offers, offerCount: result.offerCount, retrievalMeta: { origin: result.origin, destination: result.destination, departureDate: result.departureDate, returnDate: result.returnDate, adults: result.adults, cabinClass: result.cabinClass } } : {}),
      ...(result.success ? { retrievedAtUtc: result.retrievedAtUtc, disclaimer: result.disclaimer } : { error: result.error, message: result.message }),
    });
  } catch (err) {
    console.error(`❌ [Amadeus Flight Offers Error]: ${err.message}`);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: 'ValidationError', message: err.message });
    }
    if (err.name === 'AmadeusNotConfiguredError') {
      return res.status(503).json({
        success: false,
        error: 'AmadeusNotConfigured',
        message: err.message,
        source: 'AMADEUS',
      });
    }
    if (err.name === 'TimeoutError') {
      return res.status(504).json({ success: false, error: 'GatewayTimeout', message: 'Amadeus flight offers service timed out. Please retry.' });
    }
    if (err.name === 'ExternalApiError') {
      return res.status(502).json({ success: false, error: 'BadGateway', message: `Amadeus flight offers provider error: ${err.message}` });
    }
    return res.status(500).json({ success: false, error: 'ServerError', message: 'Failed to retrieve flight offers.' });
  }
}

module.exports = {
  getFlightOffers: getFlightOffersHandler,
};
