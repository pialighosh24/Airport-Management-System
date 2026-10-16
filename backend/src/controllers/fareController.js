/**
 * Fare Controller (Demo Mode)
 * 
 * Provides simulated flight fare comparison data featuring:
 * - Transparent ranking criteria (cheapest, fastest, best_value)
 * - Explicit baggage allowances and zero hidden fees guarantee
 */

const { DEMO_FARES, DEMO_DISCLAIMER } = require('../data/demoData');

const VALID_SORT_OPTIONS = ['cheapest', 'fastest', 'best_value'];

/**
 * @route   GET /api/fares
 * @desc    Get flight fare comparison records with transparent ranking
 * @query   origin (optional): 3-letter IATA code (e.g. JFK)
 * @query   destination (optional): 3-letter IATA code (e.g. LHR)
 * @query   sortBy (optional): 'cheapest' | 'fastest' | 'best_value' (default: 'best_value')
 */
const getFares = (req, res) => {
  const { origin, destination, sortBy = 'best_value' } = req.query;

  // 1. Validate sortBy parameter
  const normalizedSort = sortBy.toLowerCase().trim();
  if (!VALID_SORT_OPTIONS.includes(normalizedSort)) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: `Invalid sortBy option '${sortBy}'. Allowed values: ${VALID_SORT_OPTIONS.join(', ')}.`,
      allowedValues: VALID_SORT_OPTIONS,
    });
  }

  // 2. Validate origin if provided
  if (origin && !/^[a-zA-Z]{3}$/.test(origin.trim())) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: `Invalid origin code '${origin}'. Must be a 3-letter IATA code.`,
    });
  }

  // 3. Validate destination if provided
  if (destination && !/^[a-zA-Z]{3}$/.test(destination.trim())) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: `Invalid destination code '${destination}'. Must be a 3-letter IATA code.`,
    });
  }

  let results = [...DEMO_FARES];

  if (origin) {
    results = results.filter(
      (f) => f.originIata.toUpperCase() === origin.trim().toUpperCase()
    );
  }

  if (destination) {
    results = results.filter(
      (f) => f.destinationIata.toUpperCase() === destination.trim().toUpperCase()
    );
  }

  // 4. Apply Transparent Ranking Criteria
  results.sort((a, b) => {
    if (normalizedSort === 'cheapest') {
      return a.totalFareUsd - b.totalFareUsd;
    }
    if (normalizedSort === 'fastest') {
      return a.durationMinutes - b.durationMinutes;
    }
    if (normalizedSort === 'best_value') {
      // Best Value computes upfront price PLUS any required checked bag fees
      const effA = a.totalFareUsd + (a.baggage.checkedBagIncluded ? 0 : a.baggage.extraCheckedBagFeeUsd || 50);
      const effB = b.totalFareUsd + (b.baggage.checkedBagIncluded ? 0 : b.baggage.extraCheckedBagFeeUsd || 50);
      return effA - effB;
    }
    return 0;
  });

  const sortExplanations = {
    cheapest: 'Ranked strictly by lowest total checkout price.',
    fastest: 'Ranked by shortest flight duration in minutes.',
    best_value: 'Ranked by true value factoring in upfront ticket fare AND baggage fees.',
  };

  res.status(200).json({
    success: true,
    isDemo: true,
    disclaimer: DEMO_DISCLAIMER,
    count: results.length,
    rankingCriteria: {
      applied: normalizedSort,
      explanation: sortExplanations[normalizedSort],
    },
    data: results,
  });
};

module.exports = {
  getFares,
};
