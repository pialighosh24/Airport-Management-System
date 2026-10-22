const config = require('../config');

function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  console.error(`❌ [Internal Error]: ${err.message}`);
  if (config.nodeEnv === 'development' && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected server error occurred.',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
