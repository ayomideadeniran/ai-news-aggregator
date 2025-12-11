// File: src/services/aggregator.js

const { fetchHackerNews } = require('./fetchers/hackernews');
const { fetchNewsData } = require('./fetchers/newsdata');
const { logger } = require('../utils/logger');

/**
 * Normalizes a single article object from any source to a consistent structure.
 * This function now includes a fallback to use the title as the description if no summary is found.
 * @param {object} article - The raw article object from a fetcher.
 * @returns {object|null} The normalized article, or null if essential fields are missing.
 */
function normalizeArticle(article) {
    if (!article) return null;

    // Use common properties from different APIs and map them to our standards
    const title = article.title || article.headline || article.name; 
    const link = article.link || article.url || article.link_url;

    // Expanded description fields (the temporary log showed these were mostly missing)
    let description = article.description 
                      || article.contentSnippet 
                      || article.summary 
                      || article.text 
                      || article.content 
                      || article['content:encoded']; 
    
    // --- CRITICAL FIX: FINAL MAPPING FALLBACK ---
    if (!description && title) {
        // If the article has a title but no summary field, use the title as the description.
        description = `Article about: ${title}`; 
    }
    // --------------------------------------------

    if (!title || !description || !link) {
        // Only skip if the title or link is still missing (which shouldn't happen now for most articles)
        logger.warn('Skipping article during normalization (missing essential title/link).', { source: article.source, link: article.link });
        return null;
    }

    return {
        // Standardized fields for AI filtering
        title: title.trim(),
        description: description.trim(), // Guaranteed to have a value now
        link: link.trim(),
        
        // Retain source info
        source: article.source || 'Unknown', 
        pubDate: article.pubDate || null
    };
}


/**
 * Fetches data from all working sources, normalizes it, and returns a single list.
 * @returns {Promise<Array<object>>} A list of normalized news articles.
 */
async function fetchAndNormalizeNews() {
    logger.info('Starting raw data fetch and normalization from all sources...');

    try {
        // 1. Fetch data from only the WORKING sources in parallel
        const [hackerNewsArticles, newsDataArticles] = await Promise.all([
            fetchHackerNews(),
            fetchNewsData(),
        ]);

        // 2. Combine all raw articles into one array
        const allRawArticles = [
            ...hackerNewsArticles, 
            ...newsDataArticles
        ].flat().filter(Boolean);

        // 3. Normalize and filter the articles
        const normalizedArticles = allRawArticles
            .map(normalizeArticle)
            .filter(article => article !== null);
        
        return normalizedArticles;

    } catch (error) {
        logger.error('Error during data fetching or normalization in aggregator:', error);
        return [];
    }
}

module.exports = { fetchAndNormalizeNews };


