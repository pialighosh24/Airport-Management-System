const express = require('express');
const { getFares, priceCheck } = require('../controllers/fareController');

const router = express.Router();

/**
 * @route   GET /api/fares
 * @desc    Get demo flight fares with transparent ranking criteria
 */
router.get('/', getFares);

/**
 * @route   POST /api/fares/:offerId/price-check
 * @desc    Revalidate an offer with supplier before leaving to booking (Blueprint Section 11)
 */
router.post('/:offerId/price-check', priceCheck);

module.exports = router;
