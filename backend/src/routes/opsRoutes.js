const express = require('express');
const {
  getCases,
  createCase,
  updateCase,
  getMilestones,
} = require('../controllers/opsController');

const router = express.Router();

/**
 * @route   GET /api/ops/cases
 * @desc    Get ground turnaround & disruption cases
 */
router.get('/cases', getCases);

/**
 * @route   POST /api/ops/cases
 * @desc    Create new turnaround disruption case
 */
router.post('/cases', createCase);

/**
 * @route   PATCH /api/ops/cases/:id
 * @desc    Update case status or turnaround milestone
 */
router.patch('/cases/:id', updateCase);

/**
 * @route   GET /api/ops/milestones
 * @desc    Get list of turnaround stages
 */
router.get('/milestones', getMilestones);

module.exports = router;
