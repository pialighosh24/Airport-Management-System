const Disruption = require('../models/Disruption');

/**
 * @route   GET /api/disruptions
 * @desc    Get all disruption cases with status and severity filters
 */
async function getDisruptions(req, res) {
  try {
    const { status, severity, flightNumber } = req.query;
    const disruptions = await Disruption.find({ status, severity, flightNumber });

    return res.status(200).json({
      success: true,
      count: disruptions.length,
      data: disruptions,
    });
  } catch (err) {
    console.error('❌ [Disruptions GET Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to retrieve disruption incidents.',
    });
  }
}

/**
 * @route   GET /api/disruptions/:id
 * @desc    Get single disruption details
 */
async function getDisruptionById(req, res) {
  try {
    const { id } = req.params;
    const disruption = await Disruption.findById(id);

    if (!disruption) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: `Disruption incident '${id}' was not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: disruption,
    });
  } catch (err) {
    console.error('❌ [Disruptions GET by ID Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to retrieve disruption incident.',
    });
  }
}

/**
 * @route   POST /api/disruptions
 * @desc    Log a new flight disruption incident (Staff access)
 */
async function createDisruption(req, res) {
  try {
    const {
      flightNumber,
      route,
      incidentType,
      severity,
      impactedPassengers,
      status = 'open',
      reportedBy,
      summary,
      actionPlan,
      rebookingStatus = 'not_required',
    } = req.body;

    if (!flightNumber || !summary) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Flight number and summary are required to log a disruption.',
      });
    }

    const newCase = await Disruption.create({
      flightNumber,
      route,
      incidentType,
      severity,
      impactedPassengers,
      status,
      reportedBy: reportedBy || (req.user ? req.user.fullName : 'Station Operations'),
      summary,
      actionPlan,
      rebookingStatus,
    });

    return res.status(201).json({
      success: true,
      message: 'Disruption incident logged successfully.',
      data: newCase,
    });
  } catch (err) {
    console.error('❌ [Disruptions POST Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to log disruption incident.',
    });
  }
}

/**
 * @route   PATCH /api/disruptions/:id
 * @desc    Update disruption status, severity, or action plan
 */
async function updateDisruption(req, res) {
  try {
    const { id } = req.params;
    const { status, severity, actionPlan, rebookingStatus } = req.body;

    const existing = await Disruption.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: `Disruption incident '${id}' was not found.`,
      });
    }

    const updated = await Disruption.update(id, {
      status,
      severity,
      actionPlan,
      rebookingStatus,
    });

    return res.status(200).json({
      success: true,
      message: 'Disruption incident updated.',
      data: updated,
    });
  } catch (err) {
    console.error('❌ [Disruptions PATCH Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to update disruption incident.',
    });
  }
}

module.exports = {
  getDisruptions,
  getDisruptionById,
  createDisruption,
  updateDisruption,
};
