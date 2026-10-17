const express = require('express');
const { getFares, priceCheck, getCurrencyRates } = require('../controllers/fareController');

const router = express.Router();

/**
 * @route   GET /api/fares
 * @desc    Get flight fares with transparent ranking criteria and live FX conversion
 */
router.get('/', getFares);

/**
 * @route   GET /api/fares/exchange-rates
 * @desc    Get real-time / cached currency exchange rates with source provenance
 */
router.get('/exchange-rates', getCurrencyRates);

/**
 * @route   POST /api/fares/:offerId/price-check
 * @desc    Revalidate an offer with supplier before leaving to booking (Blueprint Section 11)
 */
router.post('/:offerId/price-check', priceCheck);

module.exports = router;
