const express = require('express');
const {
  getDisruptions,
  getDisruptionById,
  createDisruption,
  updateDisruption,
} = require('../controllers/disruptionController');
const { authenticateToken, requireStaff } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getDisruptions);
router.get('/:id', getDisruptionById);
router.post('/', authenticateToken, requireStaff, createDisruption);
router.patch('/:id', authenticateToken, requireStaff, updateDisruption);

module.exports = router;
