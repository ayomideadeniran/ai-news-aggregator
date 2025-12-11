const axios = require('axios');
const { logger } = require('../../utils/logger');

const REDDIT_API_URL = 'https://www.reddit.com/r/all/top.json?limit=10&t=day';

async function fetchRedditNews() {
  try {
    const response = await axios.get(REDDIT_API_URL);
    const posts = response.data.data.children;

    const normalizedData = posts.map(item => ({
      source: 'Reddit',
      title: item.data.title,
      url: `https://www.reddit.com${item.data.permalink}`,
      publishedAt: new Date(item.data.created_utc * 1000).toISOString(),
      score: item.data.score
    }));

    logger.info(`Fetched ${normalizedData.length} items from Reddit`);
    return normalizedData;

  } catch (error) {
    logger.error('Error fetching from Reddit:', error.message);
    return [];
  }
}

module.exports = { fetchRedditNews };