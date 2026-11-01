/**
 * AeroNexus — Flight Operations Notices Controller
 *
 * CRUD for Flight Operations Notices consumed by the Admin Panel.
 */

const Notice = require('../models/Notice');

const VALID_STATUSES = ['draft', 'published', 'deactivated'];

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
