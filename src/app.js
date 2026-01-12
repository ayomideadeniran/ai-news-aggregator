const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const trendingRoutes = require('./routes/trending');
const { limiter } = require('./middleware/rateLimiter');
const { logger } = require('./utils/logger');

// Initialize Express
const app = express();

// --- Security and Middleware ---
// Basic security settings - adjusted for SPA
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for simplicity in this demo, or configure it properly
}));

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

// --- API Routes ---
app.use('/api/v1/trending', trendingRoutes);

// --- Static Files & SPA Routing ---
// Serve static files from the React app build folder
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));

// Catch-all route to serve index.html for any non-API routes (SPA support)
app.get('*', (req, res) => {
    // If the request is for an API, don't serve index.html
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'API route not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
    logger.error(`Unhandled Error: ${err.stack}`);
    res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;