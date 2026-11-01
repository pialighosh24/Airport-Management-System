/**
 * Admin Controller
 *
 * Provides aggregated operations statistics and management data for the
 * AeroNexus Admin Panel. All flight/disruption/user reads use the same
 * data layer as the public APIs (MySQL when connected, demo fallback otherwise).
 */

const { isDatabaseConnected, getDatabaseHealth } = require('../config/database');
const Flight = require('../models/Flight');
const Disruption = require('../models/Disruption');
const User = require('../models/User');
const { DEMO_FLIGHTS } = require('../data/demoData');
const { collectHealthData } = require('./healthController');
const { recordAdminAudit } = require('../services/auditService');

// Flight statuses considered active / in the operational airspace
const ACTIVE_STATUSES = ['en_route', 'departed', 'approaching'];

/**
 * @route   GET /api/admin/stats
 * @desc    Aggregated admin dashboard statistics
 */
const getAdminStats = async (req, res) => {
  try {
    const isDb = isDatabaseConnected();
    const flights = isDb ? await Flight.find({}) : DEMO_FLIGHTS;
    const disruptions = await Disruption.find({ status: 'all' });
    const users = await User.find();

    const activeFlights = flights.filter((f) => ACTIVE_STATUSES.includes(f.status)).length;
    const delayedFlights = flights.filter((f) => f.status === 'delayed').length;
    const cancelledFlights = flights.filter((f) => f.status === 'cancelled').length;
    const openDisruptions = disruptions.filter((d) => d.status === 'open');

    const trackedAirports = new Set();
    for (const flight of flights) {
      const origin = flight?.origin?.iata;
      const destination = flight?.destination?.iata;
      if (origin) trackedAirports.add(origin);
      if (destination) trackedAirports.add(destination);
    }

    const recentActivities = [...disruptions]
      .sort((a, b) => new Date(b?.createdAtUtc || 0).getTime() - new Date(a?.createdAtUtc || 0).getTime())
      .slice(0, 5)
      .map((d) => ({
        id: d.id,
        flightNumber: d.flightNumber,
        category: d.category,
        title: d.title,
        severity: d.severity,
        status: d.status,
        summary: d.summary,
        createdAtUtc: d.createdAtUtc,
        updatedAtUtc: d.updatedAtUtc,
      }));

    return res.status(200).json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        flights: {
          total: flights.length,
          active: activeFlights,
          delayed: delayedFlights,
          cancelled: cancelledFlights,
          enRoute: activeFlights,
        },
        openDisruptions: openDisruptions.length,
        disruptions: disruptions,
        registeredUsers: users.length,
        airports: {
          tracked: trackedAirports.size,
        },
        recentActivities,
      },
    });
  } catch (err) {
    console.error('❌ [Admin Stats Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to retrieve administrative operations statistics.',
    });
  }
};

/**
 * @route   GET /api/admin/flights
 * @desc    List all flights for the Admin Panel (optional status/search filters)
 */
const getAdminFlights = async (req, res) => {
  try {
    const isDb = isDatabaseConnected();
    const flights = isDb ? await Flight.find({}) : DEMO_FLIGHTS;

    let data = flights;
    if (req.query.status) {
      const statusFilter = String(req.query.status).toLowerCase();
      data = data.filter((f) => f.status === statusFilter);
    }

    if (req.query.search) {
      const search = String(req.query.search).trim().toUpperCase();
      data = data.filter(
        (f) =>
          (f.flightNumber || '').toUpperCase().includes(search) ||
          (f.callsign || '').toUpperCase().includes(search)
      );
    }

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error('❌ [Admin Flights Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to retrieve the administrative flight list.',
    });
  }
};

/**
 * @route   PATCH /api/admin/flights/:identifier/status
 * @desc    Update operational status of a flight
 */
const updateAdminFlightStatus = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Flight status is required.',
      });
    }

    const VALID_STATUSES = ['scheduled', 'en_route', 'delayed', 'cancelled', 'departed', 'approaching', 'boarding', 'landed'];
    if (!VALID_STATUSES.includes(String(status).toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: `Invalid flight status '${status}'. Allowed values: ${VALID_STATUSES.join(', ')}.`,
      });
    }

    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        error: 'DatabaseUnavailable',
        message: 'Flight status updates require an active database connection. Current mode: demo fallback.',
      });
    }

    const updatedFlight = await Flight.updateStatus(String(identifier), String(status).toLowerCase());

    if (!updatedFlight) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: `Flight '${identifier}' was not found.`,
      });
    }

    recordAdminAudit({
      action: 'FLIGHT_STATUS_UPDATED',
      actor: req.user?.username || req.user?.email || null,
      target: String(identifier),
      severity: 'info',
      status: 'success',
      metadata: { status: String(status).toLowerCase() },
    });

    return res.status(200).json({
      success: true,
      message: 'Flight status updated successfully.',
      data: updatedFlight,
    });
  } catch (err) {
    console.error('❌ [Admin Flight Status Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to update flight status.',
    });
  }
};

/**
 * @route   GET /api/admin/disruptions
 * @desc    List all disruption cases for the Admin Panel
 */
const getAdminDisruptions = async (req, res) => {
  try {
    const disruptions = await Disruption.find({ status: 'all' });

    return res.status(200).json({
      success: true,
      count: disruptions.length,
      data: disruptions,
    });
  } catch (err) {
    console.error('❌ [Admin Disruptions Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to retrieve disruption incidents.',
    });
  }
};

/**
 * @route   PATCH /api/admin/disruptions/:id
 * @desc    Update or resolve a disruption incident
 */
const updateAdminDisruptionStatus = async (req, res) => {
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

    recordAdminAudit({
      action: 'DISRUPTION_UPDATED',
      actor: req.user?.username || req.user?.email || null,
      target: String(id),
      severity: 'warning',
      status: 'success',
      metadata: { status: status || existing.status, severity: severity || existing.severity },
    });

    return res.status(200).json({
      success: true,
      message: 'Disruption incident updated.',
      data: updated,
    });
  } catch (err) {
    console.error('❌ [Admin Disruption Update Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to update disruption incident.',
    });
  }
};

/**
 * @route   GET /api/admin/users
 * @desc    List registered users for the Admin Panel
 */
const getAdminUsers = async (req, res) => {
  try {
    const users = await User.find();

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    console.error('❌ [Admin Users Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to retrieve registered users.',
    });
  }
};

/**
 * @route   GET /api/admin/monitoring
 * @desc    Aggregated backend / database / external API monitoring snapshot for Admin Panel
 */
const getAdminMonitoring = async (req, res) => {
  try {
    const health = collectHealthData();
    const dbHealth = getDatabaseHealth();

    const isDb = isDatabaseConnected();
    const flights = isDb ? await Flight.find({}) : DEMO_FLIGHTS;
    const disruptions = await Disruption.find({ status: 'all' });
    const users = await User.find();

    return res.status(200).json({
      success: true,
      data: {
        ...health,
        database: dbHealth,
        summary: {
          flights: {
            total: flights.length,
            active: flights.filter((f) => ACTIVE_STATUSES.includes(f.status)).length,
          },
          openDisruptions: disruptions.filter((d) => d.status === 'open').length,
          registeredUsers: users.length,
        },
      },
    });
  } catch (err) {
    console.error('❌ [Admin Monitoring Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to retrieve administrative monitoring data.',
    });
  }
};

/**
 * @route   PATCH /api/admin/users/:id/role
 * @desc    Update a user role (passenger / staff / admin) for Admin Panel user management
 */
const updateAdminUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['passenger', 'staff', 'admin'];
    const cleanRole = String(role || '').toLowerCase();
    if (!validRoles.includes(cleanRole)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: `Invalid user role '${role}'. Allowed values: ${validRoles.join(', ')}.`,
      });
    }

    const updatedUser = await User.updateRole(id, cleanRole);
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: `User '${id}' was not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User role updated successfully.',
      data: updatedUser,
    });
  } catch (err) {
    console.error('❌ [Admin User Role Error]:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: 'ValidationError', message: err.message });
    }
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to update user role.',
    });
  }
};

/**
 * @route   POST /api/admin/flights
 * @desc    Create / upsert a flight record into the operational store
 */
const createAdminFlight = async (req, res) => {
  try {
    const flight = req.body;
    if (!flight || !flight.flightNumber) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Flight number is required.',
      });
    }

    const result = await Flight.insertOne(flight);
    const created = await Flight.findOne({ flightNumber: String(flight.flightNumber) });

    return res.status(201).json({
      success: true,
      message: 'Flight saved successfully.',
      data: created || flight,
    });
  } catch (err) {
    console.error('❌ [Admin Flight Create Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to create flight record.',
    });
  }
};

/**
 * @route   PUT /api/admin/flights/:identifier
 * @desc    Update an existing flight record (upsert semantics keyed by flight number)
 */
const updateAdminFlight = async (req, res) => {
  try {
    const { identifier } = req.params;
    const flight = { ...req.body, flightNumber: String(identifier).toUpperCase() };

    if (!flight.flightNumber) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Flight number is required.',
      });
    }

    const result = await Flight.insertOne(flight);
    const updated = await Flight.findOne({ flightNumber: flight.flightNumber });

    return res.status(200).json({
      success: true,
      message: 'Flight updated successfully.',
      data: updated || flight,
    });
  } catch (err) {
    console.error('❌ [Admin Flight Update Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to update flight record.',
    });
  }
};

/**
 * @route   DELETE /api/admin/flights/:identifier
 * @desc    Delete a flight record from the operational store
 */
const deleteAdminFlight = async (req, res) => {
  try {
    const { identifier } = req.params;
    const result = await Flight.deleteMany({ flightNumber: String(identifier).toUpperCase() });

    if (!result || !result.deletedCount) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: `Flight '${identifier}' was not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Flight deleted successfully.',
      data: { deletedCount: result.deletedCount },
    });
  } catch (err) {
    console.error('❌ [Admin Flight Delete Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to delete flight record.',
    });
  }
};

module.exports = {
  getAdminStats,
  getAdminFlights,
  updateAdminFlightStatus,
  getAdminDisruptions,
  updateAdminDisruptionStatus,
  getAdminUsers,
  getAdminMonitoring,
  updateAdminUserRole,
  createAdminFlight,
  updateAdminFlight,
  deleteAdminFlight,
};
