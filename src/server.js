// File: src/server.js

require('dotenv').config();
const { logger } = require('./utils/logger');
const { redisClient } = require('./utils/cache');
const app = require('./app'); // Import the configured Express app

const PORT = process.env.PORT || 3000;

// Connect to Redis
redisClient.on('ready', () => {
    // Start the server only after Redis is ready
    app.listen(PORT, () => {
        logger.info(`Server listening on port ${PORT}`);
        logger.info(`Access trending API endpoint: http://localhost:${PORT}/api/v1/trending`);
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