const axios = require('axios');
const { logger } = require('../../utils/logger');

const HN_TOP_STORIES = 'https://hacker-news.firebaseio.com/v0/topstories.json';
const HN_ITEM_URL = (id) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;

async function fetchHackerNews() {
  try {
    const { data: ids } = await axios.get(HN_TOP_STORIES);
    const top10Ids = ids.slice(0, 10);

    const postPromises = top10Ids.map(id => axios.get(HN_ITEM_URL(id)));
    const responses = await Promise.all(postPromises);

    const normalizedData = responses
      .map(res => res.data)
      .filter(item => item && item.url)
      .map(item => ({
        source: 'HackerNews',
        title: item.title,
        url: item.url,
        publishedAt: new Date(item.time * 1000).toISOString(),
        score: item.score
      }));

    logger.info(`Fetched ${normalizedData.length} items from HackerNews`);
    return normalizedData;

  } catch (error) {
    logger.error('Error fetching from HackerNews:', error.message);
    return [];
  }
}

module.exports = { fetchHackerNews };