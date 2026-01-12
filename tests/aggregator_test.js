require('dotenv').config();
const { fetchAndNormalizeNews } = require('../src/services/aggregator');
const { setCache } = require('../src/utils/cache');
const { logger } = require('../src/utils/logger');

const AGGREGATOR_CACHE_KEY = 'trending_news_raw';

describe('News Aggregator Service', () => {
    test('should fetch, normalize, and cache news articles', async () => {
        logger.info('--- NEWS AGGREGATOR TEST START ---');
        
        const articles = await fetchAndNormalizeNews();
        
        expect(Array.isArray(articles)).toBe(true);
        
        if (articles.length > 0) {
            const EXPIRY_SECONDS = 3600; // 1 hour
            await setCache(AGGREGATOR_CACHE_KEY, articles, EXPIRY_SECONDS);
            
            logger.info(`Successfully fetched and cached ${articles.length} raw, normalized articles.`);
            expect(articles[0]).toHaveProperty('title');
        } else {
            logger.warn('No articles retrieved. This might be due to API limits or network issues.');
        }
    }, 60000);
});