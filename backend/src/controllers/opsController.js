/**
 * Operations & Ground Turnaround Controller
 * 
 * Manages airport ground handling cases, ramp turnaround milestones,
 * and operational disruption reporting.
 */

// In-memory operations store (persists across requests during runtime)
let opsCases = [
  {
    id: 'disp-001',
    caseNumber: 'DIS-2026-042',
    flightNumber: 'EK202',
    route: 'JFK -> DXB',
    incidentType: 'mechanical',
    severity: 'medium',
    impactedPassengers: 382,
    status: 'investigating',
    createdAtUtc: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    updatedAtUtc: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    reportedBy: 'Station Operations Duty Lead (JFK T4)',
    summary: 'Auxiliary Power Unit (APU) starter valve fault reported during pre-departure startup.',
    actionPlan: 'Aircraft pulled to stand A6B for line maintenance valve swap. Meal vouchers distributed. Estimated departure revised to +40 mins.',
    rebookingStatus: 'not_required',
    turnaroundMilestone: 'fueling',
  },
  {
    id: 'disp-002',
    caseNumber: 'DIS-2026-043',
    flightNumber: 'BA178',
    route: 'JFK -> LHR',
    incidentType: 'air_traffic_control',
    severity: 'low',
    impactedPassengers: 294,
    status: 'open',
    createdAtUtc: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    updatedAtUtc: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    reportedBy: 'Dispatch Operations Central',
    summary: 'North Atlantic Track (NAT) Shanwick Oceanic sector congestion spacing requirement.',
    actionPlan: 'Adjusted flight level from FL370 to FL350 to expedite oceanic clearance window.',
    rebookingStatus: 'not_required',
    turnaroundMilestone: 'catering',
  },
  {
    id: 'disp-003',
    caseNumber: 'DIS-2026-040',
    flightNumber: 'AI101',
    route: 'DEL -> JFK',
    incidentType: 'weather',
    severity: 'high',
    impactedPassengers: 236,
    status: 'open',
    createdAtUtc: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    updatedAtUtc: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    reportedBy: 'Delhi Station Ramp Supervisor',
    summary: 'Dense winter radiation fog at DEL causing low visibility takeoff procedure (LVTO CAT III-B).',
    actionPlan: 'Slot revised by +30 mins. Baggage loading prioritized.',
    rebookingStatus: 'in_progress',
    turnaroundMilestone: 'baggage',
  },
];

const TURNAROUND_MILESTONES = [
  'deboarding',
  'cleaning',
  'fueling',
  'catering',
  'baggage',
  'boarding_closed',
];

/**
 * @route   GET /api/ops/cases
 * @desc    Get all disruption and turnaround dispatch cases
 */
const getCases = (req, res) => {
  const { status, flightNumber } = req.query;

  let filtered = [...opsCases];
  if (status) {
    filtered = filtered.filter((c) => c.status === status.toLowerCase().trim());
  }
  if (flightNumber) {
    filtered = filtered.filter(
      (c) => c.flightNumber.toUpperCase() === flightNumber.toUpperCase().trim()
    );
  }

  res.status(200).json({
    success: true,
    count: filtered.length,
    data: filtered,
  });
};

/**
 * @route   POST /api/ops/cases
 * @desc    Create a new ground handling disruption case
 */
const createCase = (req, res) => {
  const {
    flightNumber,
    route,
    incidentType = 'other',
    severity = 'medium',
    impactedPassengers = 0,
    reportedBy = 'Ramp Officer',
    summary,
    actionPlan,
    rebookingStatus = 'not_required',
    turnaroundMilestone = 'deboarding',
  } = req.body;

  if (!flightNumber || !summary) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'flightNumber and summary fields are required.',
    });
  }

  const caseId = `disp-${Date.now()}`;
  const caseNumber = `DIS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  const newCase = {
    id: caseId,
    caseNumber,
    flightNumber: flightNumber.trim().toUpperCase(),
    route: route ? route.trim() : 'Route Unspecified',
    incidentType,
    severity,
    impactedPassengers: Number(impactedPassengers) || 0,
    status: 'open',
    createdAtUtc: new Date().toISOString(),
    updatedAtUtc: new Date().toISOString(),
    reportedBy,
    summary,
    actionPlan: actionPlan || 'Investigating turnaround root cause.',
    rebookingStatus,
    turnaroundMilestone,
  };

  opsCases.unshift(newCase);

  res.status(201).json({
    success: true,
    message: 'Disruption case opened successfully.',
    data: newCase,
  });
};

/**
 * @route   PATCH /api/ops/cases/:id
 * @desc    Update status or turnaround milestone of a case
 */
const updateCase = (req, res) => {
  const { id } = req.params;
  const { status, actionPlan, turnaroundMilestone, rebookingStatus } = req.body;

  const foundIndex = opsCases.findIndex((c) => c.id === id);
  if (foundIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'NotFound',
      message: `Case '${id}' not found.`,
    });
  }

  const existing = opsCases[foundIndex];
  const updated = {
    ...existing,
    ...(status && { status }),
    ...(actionPlan && { actionPlan }),
    ...(turnaroundMilestone && { turnaroundMilestone }),
    ...(rebookingStatus && { rebookingStatus }),
    updatedAtUtc: new Date().toISOString(),
  };

  opsCases[foundIndex] = updated;

  res.status(200).json({
    success: true,
    message: 'Case updated successfully.',
    data: updated,
  });
};

/**
 * @route   GET /api/ops/milestones
 * @desc    Get defined turnaround milestone stages
 */
const getMilestones = (req, res) => {
  res.status(200).json({
    success: true,
    stages: TURNAROUND_MILESTONES,
  });
};

module.exports = {
  getCases,
  createCase,
  updateCase,
  getMilestones,
};
