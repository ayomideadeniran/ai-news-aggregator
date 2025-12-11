require('dotenv').config();
const { getFilteredNews } = require('../src/controllers/trendingController'); // Use the controller function here
const { logger } = require('../src/utils/logger');
const { getCache } = require('../src/utils/cache');

const AGGREGATOR_CACHE_KEY = 'trending_news_raw';

async function testAIFiltering() {
  logger.info('--- AI FILTERING TEST START ---');

  // Check if raw data cache exists 
  const rawCache = await getCache(AGGREGATOR_CACHE_KEY);
  if (!rawCache) {
    logger.warn('Raw news cache is empty. Please run aggregator_test.js first, or restart the server, to populate it.');
  }

  console.time('AIFilteringTime');
  const filteredNews = await getFilteredNews();
  console.timeEnd('AIFilteringTime');

  if (filteredNews.length === 0) {
    logger.error('Failed to retrieve or filter any news items. Check GROQ_API_KEY and network.');
    return;
  }
  
  logger.info(`Successfully filtered ${filteredNews.length} articles.`);
  logger.info(`Top 5 articles (Sorted by AI Score):`);

  filteredNews.slice(0, 5).forEach((item, index) => {
    console.log(
      `\n${index + 1}. [Score: ${item.ai_score}/10, Category: ${item.ai_category}]`
    );
    console.log(`   Title: ${item.title}`);
    console.log(`   Summary: ${item.ai_summary}`);
    console.log(`   Source: ${item.source}`);
  });

  // Test the AI cache hit
  logger.info('\n--- Testing AI Cache Hit ---');
  console.time('AICacheHit');
  const cachedNews = await getFilteredNews();
  console.timeEnd('AICacheHit');
  logger.info(`Cache Hit count: ${cachedNews.length}`);
  
  // Keep process alive briefly to ensure Redis logs print
  setTimeout(() => process.exit(0), 1000);
}

testAIFiltering();