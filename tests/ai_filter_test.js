require('dotenv').config();
const { getFilteredNews } = require('../src/controllers/trendingController');
const { logger } = require('../src/utils/logger');
const { getCache } = require('../src/utils/cache');

const AGGREGATOR_CACHE_KEY = 'trending_news_raw';

describe('AI Filtering Service', () => {
  test('should filter news using AI', async () => {
    logger.info('--- AI FILTERING TEST START ---');

    const rawCache = await getCache(AGGREGATOR_CACHE_KEY);
    if (!rawCache) {
      logger.warn('Raw news cache is empty. Please run aggregator_test.js first, or restart the server, to populate it.');
    }

    const filteredNews = await getFilteredNews();

    expect(Array.isArray(filteredNews)).toBe(true);

    if (filteredNews.length > 0) {
      logger.info(`Successfully filtered ${filteredNews.length} articles.`);
      expect(filteredNews[0]).toHaveProperty('ai_score');
      expect(filteredNews[0]).toHaveProperty('ai_category');

      // Test cache hit
      logger.info('\n--- Testing AI Cache Hit ---');
      const cachedNews = await getFilteredNews();
      expect(cachedNews.length).toBe(filteredNews.length);
    } else {
      logger.warn('Failed to retrieve or filter any news items. Check GROQ_API_KEY and network.');
    }
  }, 60000);
});