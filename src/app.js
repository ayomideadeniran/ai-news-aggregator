const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const trendingRoutes = require('./routes/trending');
const { limiter } = require('./middleware/rateLimiter');
const { logger } = require('./utils/logger');

// Initialize Express
const app = express();

// --- Security and Middleware ---
// Basic security settings
app.use(helmet());

// Enable CORS for all origins
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'HEAD'] }));

// Parse JSON bodies
app.use(express.json());

// Rate limiting (max 20 requests/minute per IP)
app.use(limiter);

// Extract User ID from headers
app.use((req, res, next) => {
    req.userId = req.headers['x-user-id'] || 'anonymous';
    next();
});

// --- Routes ---
app.use('/api/v1/trending', trendingRoutes);

// Simple health check route
app.get('/', (req, res) => {
    res.json({
        service: 'AI News Aggregator API',
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
    logger.error(`Unhandled Error: ${err.stack}`);
    res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;