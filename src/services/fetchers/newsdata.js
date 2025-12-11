const axios = require('axios');
const { logger } = require('../../utils/logger');

const BASE_URL = 'https://newsdata.io/api/1/news';

async function fetchNewsData() {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) {
    logger.warn('NewsData API Key missing. Skipping...');
    return [];
  }

  try {
    const response = await axios.get(BASE_URL, {
      params: {
        apikey: apiKey,
        category: 'technology',
        language: 'en'
      }
    });

    const results = response.data.results || [];

    const normalizedData = results.slice(0, 10).map(item => ({
      source: 'NewsData',
      title: item.title,
      url: item.link,
      publishedAt: item.pubDate,
      score: 0
    }));

    logger.info(`Fetched ${normalizedData.length} items from NewsData`);
    return normalizedData;

  } catch (error) {
    logger.error('Error fetching from NewsData:', error.message);
    return [];
  }
}

module.exports = { fetchNewsData };