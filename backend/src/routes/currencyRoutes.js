const express = require('express');
const { getCurrency } = require('../controllers/currencyController');

const router = express.Router();

/**
 * @route   GET /api/currency
 * @desc    Get indicative exchange rates from the Open Exchange Rate API
 * @query   base     (optional) Base currency, default USD
 * @query   symbols  (optional) Comma separated ISO codes, default USD,INR
 * @query   refresh (optional) true/false, default false (uses server cache)
 */
router.get('/', getCurrency);

module.exports = router;
