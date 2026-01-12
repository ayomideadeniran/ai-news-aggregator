const axios = require('axios');
const { logger } = require('../../utils/logger');

const GNEWS_API_URL = 'https://gnews.io/api/v4/top-headlines';

async function fetchGNews() {
    if (!process.env.GNEWS_API_KEY) {
        logger.warn('GNEWS_API_KEY is missing. Skipping GNews fetch.');
        return [];
    }

    try {
        // Fetch top tech/AI news
        const response = await axios.get(`${GNEWS_API_URL}?token=${process.env.GNEWS_API_KEY}&topic=technology&lang=en&max=10`);
        const articles = response.data.articles || [];

        const normalizedData = articles.map(item => ({
            source: 'GNews',
            title: item.title,
            description: item.description,
            url: item.url,
            publishedAt: item.publishedAt,
            image: item.image
        }));

        logger.info(`Fetched ${normalizedData.length} items from GNews`);
        return normalizedData;

    } catch (error) {
        logger.error('Error fetching from GNews:', error.message);
        return [];
    }
}

module.exports = { fetchGNews };
