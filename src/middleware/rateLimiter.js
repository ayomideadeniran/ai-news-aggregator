const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');

// Limits each IP to 20 requests per 1 minute.
const limiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 20, 
  message: {
    status: 429,
    message: 'Too many requests, please try again after 1 minute.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit hit for IP: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  }
});

module.exports = { limiter };