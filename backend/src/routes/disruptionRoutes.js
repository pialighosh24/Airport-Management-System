const express = require('express');
const {
  getDisruptions,
  getDisruptionById,
  createDisruption,
  updateDisruption,
} = require('../controllers/disruptionController');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getDisruptions);
router.get('/:id', getDisruptionById);
router.post('/', optionalAuth, createDisruption);
router.patch('/:id', optionalAuth, updateDisruption);

module.exports = router;
