// File: src/server.js

// 1. Core Imports
require('dotenv').config(); 
const express = require('express');
const { logger } = require('./utils/logger'); // Corrected path: from src/server.js to src/utils/logger.js
const { redisClient } = require('./utils/cache'); // Corrected path: from src/server.js to src/utils/cache.js

// 2. Route Import
const apiRoutes = require('./routes/api'); // Corrected path: from src/server.js to src/routes/api.js

// 3. Application Setup
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Redis (the import above triggers the connection)
redisClient.on('ready', () => {
    // 4. Middleware setup
    app.use(express.json());

    // 5. Register API Routes
    app.use('/api', apiRoutes); // All routes in api.js start with /api

    // Simple root route
    app.get('/', (req, res) => {
        res.send('AI News Aggregator Backend is running. Access API endpoints at /api/trending');
    });

    // 6. Start the server
    app.listen(PORT, () => {
        logger.info(`Server listening on port ${PORT}`);
        logger.info(`Access trending API endpoint: http://localhost:${PORT}/api/trending`);
    });
});

// Handle cases where Redis connection fails
redisClient.on('error', (err) => {
    logger.error('Redis connection error in server.js, API might be unstable.', err);
});

// Ensure the application exits gracefully if the process is terminated
process.on('SIGINT', async () => {
    logger.info('Closing Redis client...');
    await redisClient.quit();
    logger.info('Server process terminated.');
    process.exit(0);
});