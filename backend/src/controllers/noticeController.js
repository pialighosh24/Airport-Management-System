/**
 * AeroNexus — Flight Operations Notices Controller
 *
 * CRUD for Flight Operations Notices consumed by the Admin Panel.
 */

const Notice = require('../models/Notice');

const VALID_STATUSES = ['draft', 'published', 'deactivated'];
const VALID_SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'];
const VALID_CATEGORIES = ['operational', 'medical', 'weather', 'security', 'other'];

function isValidEnum(value, allowed) {
  return allowed.includes(String(value || '').toLowerCase());
}

function validateNoticeInput({ title, category, severity, status, summary, body, effectiveFromUtc, effectiveToUtc }) {
  if (title !== undefined && title !== null) {
    const trimmedTitle = String(title).trim();
    if (trimmedTitle.length < 1 || trimmedTitle.length > 255) {
      return 'Notice title must be between 1 and 255 characters.';
    }
  }
  if (category !== undefined && category !== null && !isValidEnum(category, VALID_CATEGORIES)) {
    return `Invalid notice category '${category}'. Allowed values: ${VALID_CATEGORIES.join(', ')}.`;
  }
  if (severity !== undefined && severity !== null && !isValidEnum(severity, VALID_SEVERITIES)) {
    return `Invalid notice severity '${severity}'. Allowed values: ${VALID_SEVERITIES.join(', ')}.`;
  }
  if (status !== undefined && status !== null && !isValidEnum(status, VALID_STATUSES)) {
    return `Invalid notice status '${status}'. Allowed values: ${VALID_STATUSES.join(', ')}.`;
  }
  if (summary !== undefined && summary !== null && String(summary).length > 2000) {
    return 'Notice summary must be 2000 characters or fewer.';
  }
  if (body !== undefined && body !== null && String(body).length > 10000) {
    return 'Notice body must be 10000 characters or fewer.';
  }
  if (effectiveFromUtc !== undefined && effectiveFromUtc !== null && effectiveToUtc !== undefined && effectiveToUtc !== null) {
    const from = new Date(effectiveFromUtc);
    const to = new Date(effectiveToUtc);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from.getTime() > to.getTime()) {
      return 'Notice effective window is invalid: effective end must not precede effective start.';
    }
  }
  return null;
}

/**
 * @route   GET /api/admin/notices
 * @desc    List flight operations notices
 */
const getAdminNotices = async (req, res) => {
  try {
    const notices = await Notice.find();

    return res.status(200).json({
      success: true,
      count: notices.length,
      data: notices,
    });
  } catch (err) {
    console.error('❌ [Admin Notices Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to retrieve flight operations notices.',
    });
  }
};

/**
 * @route   POST /api/admin/notices
 * @desc    Create a new flight operations notice
 */
const createAdminNotice = async (req, res) => {
  try {
    const { title, category, severity, status, summary, body, effectiveFromUtc, effectiveToUtc, publishedBy } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Notice title is required.',
      });
    }

    const validationError = validateNoticeInput({ title, category, severity, status, summary, body, effectiveFromUtc, effectiveToUtc });
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: validationError,
      });
    }

    const created = await Notice.create({
      title,
      category,
      severity,
      status,
      summary,
      body,
      effectiveFromUtc,
      effectiveToUtc,
      publishedBy,
    });

    return res.status(201).json({
      success: true,
      message: 'Flight operations notice created.',
      data: created,
    });
  } catch (err) {
    if (err && (err.code === 'ER_DUP_ENTRY' || err.code === 'ER_DUP')) {
      return res.status(409).json({
        success: false,
        error: 'ConflictError',
        message: 'A flight operations notice with this notice number already exists.',
      });
    }
    if (err && err.message === 'Database unavailable') {
      return res.status(503).json({
        success: false,
        error: 'ServiceUnavailable',
        message: 'Notice persistence is temporarily unavailable.',
      });
    }
    console.error('❌ [Admin Notice Create Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to create flight operations notice.',
    });
  }
};

/**
 * @route   PUT /api/admin/notices/:id
 * @desc    Edit a flight operations notice (supports status transitions incl. publish / deactivate)
 */
const updateAdminNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, severity, status, summary, body, effectiveFromUtc, effectiveToUtc, publishedBy } = req.body;

    const existing = await Notice.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: `Flight operations notice '${id}' was not found.`,
      });
    }

    const nextStatus = status || existing.status;
    if (!VALID_STATUSES.includes(String(nextStatus).toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: `Invalid notice status '${status}'. Allowed values: ${VALID_STATUSES.join(', ')}.`,
      });
    }

    const validationError = validateNoticeInput({ title, category, severity, status: nextStatus, summary, body, effectiveFromUtc, effectiveToUtc });
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: validationError,
      });
    }

    const updated = await Notice.update(id, {
      title,
      category,
      severity,
      status: String(nextStatus).toLowerCase(),
      summary,
      body,
      effectiveFromUtc,
      effectiveToUtc,
      publishedBy,
    });

    return res.status(200).json({
      success: true,
      message: 'Flight operations notice updated.',
      data: updated,
    });
  } catch (err) {
    if (err && err.message === 'Database unavailable') {
      return res.status(503).json({
        success: false,
        error: 'ServiceUnavailable',
        message: 'Notice persistence is temporarily unavailable.',
      });
    }
    console.error('❌ [Admin Notice Update Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to update flight operations notice.',
    });
  }
};

/**
 * @route   DELETE /api/admin/notices/:id
 * @desc    Delete a flight operations notice
 */
const deleteAdminNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await Notice.remove(id);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: `Flight operations notice '${id}' was not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Flight operations notice deleted.',
    });
  } catch (err) {
    if (err && err.message === 'Database unavailable') {
      return res.status(503).json({
        success: false,
        error: 'ServiceUnavailable',
        message: 'Notice persistence is temporarily unavailable.',
      });
    }
    console.error('❌ [Admin Notice Delete Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to delete flight operations notice.',
    });
  }
};

module.exports = {
  getAdminNotices,
  createAdminNotice,
  updateAdminNotice,
  deleteAdminNotice,
};
