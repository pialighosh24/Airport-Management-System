/**
 * 404 Not Found Middleware
 * Catches all requests to undefined routes and returns a structured JSON error.
 */
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'NotFoundError',
    message: `Cannot ${req.method} ${req.originalUrl} - endpoint does not exist.`,
  });
};

module.exports = notFound;
