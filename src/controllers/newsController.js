// File: src/controllers/newsController.js (FINAL VERSION)

const axios = require('axios');
const { getCache } = require('../utils/cache'); 
const { logger } = require('../utils/logger');

// Keys used in Redis
const CACHE_KEY_TRENDING = 'trending_news_ai_filtered'; 

// --- CRITICAL CHANGE 1: Use the existing NewsData.io key ---
const EXTERNAL_API_KEY = process.env.NEWSDATA_API_KEY; 
// -------------------------------------------------------------

// --- Helper function to normalize NewsData.io articles ---
function normalizeExternalArticles(articles) {
    if (!articles || articles.length === 0) return [];
    
    // This normalization is specific to the NewsData.io JSON structure
    return articles.map(article => ({
        title: article.title,
        description: article.description,
        link: article.link,
        source: article.source_id,
        pubDate: article.pubDate,
        // Default values for external articles before AI analysis
        ai_score: 5, 
        ai_summary: article.description || 'Fetched live article.',
        ai_category: 'Other_Live'
    }));
}
// --------------------------------------------------------------------------


/**
 * GET /api/trending
 * Serves the list of AI-filtered and scored articles.
 */
async function getTrendingNews(req, res) {
    try {
        const filteredArticles = await getCache(CACHE_KEY_TRENDING);
        if (!filteredArticles || filteredArticles.length === 0) {
            return res.status(404).json({ 
                message: 'No trending news found. Run the aggregator and filter jobs first.' 
            });
        }
        const sortedArticles = filteredArticles.sort((a, b) => b.ai_score - a.ai_score);
        return res.json({
            count: sortedArticles.length,
            articles: sortedArticles
        });
    } catch (error) {
        logger.error('Error fetching trending news:', error);
        return res.status(500).json({ message: 'Internal server error while retrieving trending news.' });
    }
}

/**
 * GET /api/search?q=query
 * Searches the AI-filtered articles from cache AND makes a real-time call to NewsData.io.
 */
async function searchNews(req, res) {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ message: 'Search query parameter "q" is required.' });
    }

    const searchTerm = q.toLowerCase();
    let allArticles = [];

    try {
        // 1. Search Cache (Retrieves pre-scored and categorized data)
        const cachedArticles = await getCache(CACHE_KEY_TRENDING) || [];
        
        const cachedSearchResults = cachedArticles.filter(article => {
            const titleMatch = article.title?.toLowerCase().includes(searchTerm);
            const summaryMatch = article.ai_summary?.toLowerCase().includes(searchTerm);
            const categoryMatch = article.ai_category?.toLowerCase().includes(searchTerm);
            return titleMatch || summaryMatch || categoryMatch;
        });

        allArticles = [...cachedSearchResults];

        // 2. Perform Real-Time External Search (Only if API key is available)
        if (EXTERNAL_API_KEY) {
            logger.info(`Making real-time external search for: ${q} using NewsData.io`);
            
            // --- CRITICAL CHANGE 2: Use the NewsData.io API structure ---
            const newsApiUrl = `https://newsdata.io/api/1/news?apikey=${EXTERNAL_API_KEY}&qInTitle=${encodeURIComponent(q)}&language=en&size=10`;
            
            const apiResponse = await axios.get(newsApiUrl);
            const externalArticles = apiResponse.data.results; // NewsData uses 'results' key
            
            // Normalize external data and append to our results list
            const newArticles = normalizeExternalArticles(externalArticles);
            allArticles.push(...newArticles);
        } else {
             logger.warn('NEWSDATA_API_KEY not set. Skipping real-time search.');
        }

        // 3. Final Sorting
        // Sort by AI score (cached articles rank higher; live articles get default score of 5)
        const finalResults = allArticles.sort((a, b) => b.ai_score - a.ai_score); 

        // 4. Return the combined data
        return res.json({
            query: q,
            count: finalResults.length,
            articles: finalResults
        });

    } catch (error) {
        logger.error('Error during real-time news search:', error.message);
        
        // Always return the cached results, even if the external call fails
        return res.status(200).json({ 
            query: q,
            count: allArticles.length,
            articles: allArticles,
            warning: 'External NewsData.io search failed, returning only cached results.'
        });
    }
}

module.exports = {
    getTrendingNews,
    searchNews
};