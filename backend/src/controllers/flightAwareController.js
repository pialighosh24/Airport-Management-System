/**
 * AeroNexus — FlightAware Flight Status Controller
 *
 * Exposes the FlightAware AeroAPI integration through:
 * GET /api/flights/status/:identifier
 */

const { getFlightStatus } = require('../services/flightAwareService');

/**
 * @route   GET /api/flights/status/:identifier
 * @desc    Get flight status and tracking information via FlightAware
 */
async function getFlightStatusHandler(req, res) {
  try {
    const { identifier } = req.params;
    const result = await getFlightStatus(identifier);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        source: result.source,
        error: result.error,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      source: result.source,
      providerName: result.providerName,
      flightIdentifier: result.flightIdentifier,
      flight: result.flight,
      retrievedAtUtc: result.retrievedAtUtc,
      disclaimer: result.disclaimer,
    });
  } catch (err) {
    console.error(`❌ [FlightAware Flight Status Error]: ${err.message}`);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: 'ValidationError', message: err.message });
    }
    if (err.name === 'FlightAwareNotConfiguredError') {
      return res.status(503).json({ success: false, error: 'FlightAwareNotConfigured', message: err.message, source: 'FLIGHTAWARE' });
    }
    if (err.name === 'TimeoutError') {
      return res.status(504).json({ success: false, error: 'GatewayTimeout', message: 'FlightAware flight status service timed out. Please retry.' });
    }
    if (err.name === 'ExternalApiError') {
      return res.status(502).json({ success: false, error: 'BadGateway', message: `FlightAware flight status provider error: ${err.message}` });
    }
    return res.status(500).json({ success: false, error: 'ServerError', message: 'Failed to retrieve flight status.' });
  }
}

module.exports = {
  getFlightStatus: getFlightStatusHandler,
};
