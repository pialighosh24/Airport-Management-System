/**
 * AeroNexus — Ground Operations Controller (internal module)
 *
 * Internal ground-handling task workflow:
 * GET    /api/ground-operations
 * GET    /api/ground-operations/:id
 * POST   /api/ground-operations
 * PATCH  /api/ground-operations/:id
 */

const { GROUND_TASK_STATUSES } = require('../services/groundOperationsService');
const { listTasks, getTaskById, createTask, updateTask } = require('../services/groundOperationsService');

function buildError(message, name) {
  const err = new Error(message);
  err.name = name;
  return err;
}

/**
 * @route   GET /api/ground-operations
 * @desc    List ground operations tasks (filter by status / type / flightNumber)
 */
function getTasks(req, res) {
  try {
    const tasks = listTasks({
      status: req.query.status,
      type: req.query.type,
      flightNumber: req.query.flightNumber,
    });
    return res.status(200).json({ success: true, count: tasks.count, data: tasks.data });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'ServerError', message: 'Failed to retrieve ground operations tasks.' });
  }
}

/**
 * @route   GET /api/ground-operations/:id
 * @desc    Get a single ground operations task
 */
function getTask(req, res) {
  try {
    const task = getTaskById(req.params.id);
    return res.status(200).json({ success: true, data: task.data });
  } catch (err) {
    if (err.name === 'NotFoundError') {
      return res.status(404).json({ success: false, error: 'NotFoundError', message: err.message });
    }
    return res.status(500).json({ success: false, error: 'ServerError', message: 'Failed to retrieve ground operations task.' });
  }
}

/**
 * @route   POST /api/ground-operations
 * @desc    Create a ground operations task
 */
function createTaskHandler(req, res) {
  try {
    const task = createTask(req.body || {});
    return res.status(201).json({ success: true, data: task.data });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: 'ValidationError', message: err.message });
    }
    return res.status(500).json({ success: false, error: 'ServerError', message: 'Failed to create ground operations task.' });
  }
}

/**
 * @route   PATCH /api/ground-operations/:id
 * @desc    Update a ground operations task (status / assignment / notes)
 */
function updateTaskHandler(req, res) {
  try {
    const task = updateTask(req.params.id, req.body || {});
    return res.status(200).json({ success: true, data: task.data });
  } catch (err) {
    if (err.name === 'NotFoundError') {
      return res.status(404).json({ success: false, error: 'NotFoundError', message: err.message });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: 'ValidationError', message: err.message });
    }
    return res.status(500).json({ success: false, error: 'ServerError', message: 'Failed to update ground operations task.' });
  }
}

module.exports = {
  getTasks,
  getTask,
  createTask: createTaskHandler,
  updateTask: updateTaskHandler,
  GROUND_TASK_STATUSES,
};
