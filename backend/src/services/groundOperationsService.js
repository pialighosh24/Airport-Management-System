/**
 * AeroNexus — Ground Operations Engine (internal service)
 *
 * Internal operational task engine for airport ground operations:
 * - Task lifecycle: pending → in_progress → completed
 * - Assignment tracking (staff/team reference where available)
 * - Turnaround task tracking
 * - Validation + timestamps
 *
 * This is an internal AeroNexus module (not a third-party API). It runs on the
 * backend and persists tasks in an in-memory operational store (demo mode when
 * no real operational persistence source is configured).
 */

const GROUND_TASK_STATUSES = ['pending', 'in_progress', 'completed'];

const GROUND_TASK_TYPES = [
  'turnaround',
  'ground_handling',
  'gate_assistance',
  'baggage_handling',
  'passenger_assistance',
  'other',
];

let groundTasks = [];
let groundTasksCounter = 100;

function seedDemoTasks() {
  if (groundTasks.length > 0) return;
  groundTasks = [
    {
      id: 'ground_demo_1',
      taskNumber: 'GND-2026-0001',
      flightNumber: 'AI101',
      type: 'turnaround',
      status: 'in_progress',
      assignedTo: 'ops_team_alpha',
      priority: 'medium',
      notes: 'De-icing and ground handling pending crew arrival.',
      createdAtUtc: new Date(Date.now() - 42 * 60000).toISOString(),
      updatedAtUtc: new Date(Date.now() - 12 * 60000).toISOString(),
    },
    {
      id: 'ground_demo_2',
      taskNumber: 'GND-2026-0002',
      flightNumber: 'UK888',
      type: 'baggage_handling',
      status: 'pending',
      assignedTo: 'ops_team_beta',
      priority: 'low',
      notes: 'Transfer baggage pending origin arrival.',
      createdAtUtc: new Date(Date.now() - 25 * 60000).toISOString(),
      updatedAtUtc: new Date(Date.now() - 25 * 60000).toISOString(),
    },
  ];
}

function buildError(message, name) {
  const err = new Error(message);
  err.name = name;
  return err;
}

function listTasks(filters = {}) {
  seedDemoTasks();
  const { status, type, flightNumber } = filters;
  let results = [...groundTasks];
  if (status) {
    results = results.filter((t) => t.status === status);
  }
  if (type) {
    results = results.filter((t) => t.type === type);
  }
  if (flightNumber) {
    results = results.filter((t) => t.flightNumber === String(flightNumber).toUpperCase());
  }
  return { success: true, count: results.length, data: results };
}

function getTaskById(id) {
  const task = groundTasks.find((t) => t.id === id);
  if (!task) {
    const err = new Error(`Ground operations task '${id}' was not found.`);
    err.name = 'NotFoundError';
    throw err;
  }
  return { success: true, data: task };
}

function createTask(input = {}) {
  const { flightNumber, type, status, assignedTo, priority, notes } = input || {};
  const normalizedStatus = status ? String(status).toLowerCase() : 'pending';
  if (!GROUND_TASK_STATUSES.includes(normalizedStatus)) {
    throw buildError(`Invalid status '${status}'. Allowed values: ${GROUND_TASK_STATUSES.join(', ')}.`, 'ValidationError');
  }
  if (type && !GROUND_TASK_TYPES.includes(type)) {
    throw buildError(`Invalid task type '${type}'.`, 'ValidationError');
  }

  const task = {
    id: `ground_${Date.now()}_${groundTasksCounter++}`,
    taskNumber: `GND-${new Date().getFullYear()}-${String(groundTasksCounter).padStart(4, '0')}`,
    flightNumber: flightNumber ? String(flightNumber).toUpperCase() : null,
    type: type || 'ground_handling',
    status: normalizedStatus,
    assignedTo: assignedTo || null,
    priority: priority || 'medium',
    notes: notes || null,
    createdAtUtc: new Date().toISOString(),
    updatedAtUtc: new Date().toISOString(),
  };

  groundTasks = [task, ...groundTasks];
  return { success: true, data: task };
}

function updateTask(id, updates = {}) {
  const task = groundTasks.find((t) => t.id === id);
  if (!task) {
    const err = new Error(`Ground operations task '${id}' was not found.`);
    err.name = 'NotFoundError';
    throw err;
  }
  const { status, notes, assignedTo, priority, type } = updates;
  if (status) {
    const normalizedStatus = String(status).toLowerCase();
    if (!GROUND_TASK_STATUSES.includes(normalizedStatus)) {
      throw buildError(`Invalid status '${status}'. Allowed values: ${GROUND_TASK_STATUSES.join(', ')}.`, 'ValidationError');
    }
    task.status = normalizedStatus;
  }
  if (notes !== undefined) task.notes = notes;
  if (assignedTo !== undefined) task.assignedTo = assignedTo;
  if (priority !== undefined) task.priority = priority;
  if (type !== undefined) task.type = type;
  task.updatedAtUtc = new Date().toISOString();
  return { success: true, data: task };
}

module.exports = {
  GROUND_TASK_STATUSES,
  listTasks,
  getTaskById,
  createTask,
  updateTask,
};
