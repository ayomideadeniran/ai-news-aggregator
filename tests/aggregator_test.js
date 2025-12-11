// File: tests/aggregator_test.js

require('dotenv').config();
// Import the fixed function from the aggregator service
const { fetchAndNormalizeNews } = require('../src/services/aggregator'); 
const { setCache } = require('../src/utils/cache');
const { logger } = require('../src/utils/logger');

const AGGREGATOR_CACHE_KEY = 'trending_news_raw';

async function testNewsAggregator() {
    logger.info('--- NEWS AGGREGATOR TEST START ---');
    
    console.time('NewsFetchTime');
    // 1. Fetch the articles using the function that now handles normalization
    const articles = await fetchAndNormalizeNews(); 
    console.timeEnd('NewsFetchTime');

    if (articles.length === 0) {
        logger.error('Failed to retrieve any normalized news articles. Check your fetcher files.');
        return;
    }

    // 2. Save the normalized articles to Redis
    const EXPIRY_SECONDS = 3600; // 1 hour
    await setCache(AGGREGATOR_CACHE_KEY, articles, EXPIRY_SECONDS);

    logger.info(`Successfully fetched and cached ${articles.length} raw, normalized articles.`);
    logger.info(`First Article Title (for verification): ${articles[0].title}`);

    // Keep process alive briefly to ensure Redis logs print
    setTimeout(() => process.exit(0), 1000);
}

testNewsAggregator();