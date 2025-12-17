// File: src/controllers/newsController.js

const axios = require('axios');
const Groq = require('groq-sdk');
const { getCache } = require('../utils/cache'); 
const { logger } = require('../utils/logger');

// Initialize Groq SDK
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY }); 

// Keys used in Redis
const CACHE_KEY_TRENDING = 'trending_news_ai_filtered'; 
const EXTERNAL_API_KEY = process.env.NEWSDATA_API_KEY; 

/**
 * HELPER: Batch AI Scoring
 * Sends multiple articles to Groq in ONE request to avoid rate limits.
 */
async function batchScoreArticles(articles) {
    if (!articles || articles.length === 0) return [];

    // Create a numbered list for the AI to analyze in one go
    const articlesList = articles.map((a, i) => `[ID: ${i}] Title: ${a.title}`).join('\n');

    const prompt = `Analyze these ${articles.length} news articles. Output a JSON object with a key "results" containing an array of objects. 
    Each object MUST have: 
    "id" (the number provided), 
    "score" (1-10 relevance to Tech/AI/Web3), 
    "summary" (1-sentence summary), 
    "category" (AI/ML, Cloud/Infra, Mobile/Consumer, Web3/Crypto, or Other).

    Articles to analyze:
    ${articlesList}`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.1-8b-instant', // Faster model, perfect for batching
            response_format: { type: 'json_object' },
            temperature: 0.1,
        });

        const responseContent = JSON.parse(chatCompletion.choices[0].message.content);
        const aiResults = responseContent.results;

        // Map the AI results back to the original articles using the index
        return articles.map((article, index) => {
            const ai = aiResults.find(r => r.id === index) || {};
            return {
                ...article,
                ai_score: ai.score || 1,
                ai_summary: ai.summary || article.description || 'Summary unavailable.',
                ai_category: ai.category || 'Other'
            };
        });
    } catch (error) {
        logger.error("Batch AI Analysis failed:", error.message);
        // Fallback: return articles with low scores so the API doesn't crash
        return articles.map(a => ({ 
            ...a, 
            ai_score: 1, 
            ai_category: 'Error', 
            ai_summary: 'AI analysis failed during batching.' 
        }));
    }
}

/**
 * HELPER: Normalize NewsData.io articles
 */
function normalizeExternalArticles(articles) {
    if (!articles || articles.length === 0) return [];
    
    return articles.map(article => ({
        title: article.title,
        description: article.description,
        link: article.link,
        source: article.source_id,
        pubDate: article.pubDate,
        ai_score: 5, // Temporary placeholder
        ai_summary: article.description || 'Processing...',
        ai_category: 'Processing...'
    }));
}

/**
 * GET /api/trending
 */
async function getTrendingNews(req, res) {
    try {
        const filteredArticles = await getCache(CACHE_KEY_TRENDING);
        if (!filteredArticles || filteredArticles.length === 0) {
            return res.status(404).json({ message: 'No trending news found.' });
        }
        const sortedArticles = filteredArticles.sort((a, b) => b.ai_score - a.ai_score);
        return res.json({ count: sortedArticles.length, articles: sortedArticles });
    } catch (error) {
        logger.error('Error fetching trending news:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
}

/**
 * GET /api/search?q=query
 * Real-time search with Batch AI processing
 */
async function searchNews(req, res) {
    const { q, from, to } = req.query; 
    if (!q) {
        return res.status(400).json({ message: 'Search query parameter "q" is required.' });
    }

    try {
        // 1. Check Local Cache first
        const cachedArticles = await getCache(CACHE_KEY_TRENDING) || [];
        const cachedResults = cachedArticles.filter(article => 
            article.title?.toLowerCase().includes(q.toLowerCase())
        );

        // 2. Fetch Live Results from NewsData.io
        let liveArticles = [];
        if (EXTERNAL_API_KEY) {
            logger.info(`Fetching live news for: ${q}`);
            let url = `https://newsdata.io/api/1/news?apikey=${EXTERNAL_API_KEY}&qInTitle=${encodeURIComponent(q)}&language=en&size=5`;
            
            if (from) url += `&from_date=${from}`;
            if (to) url += `&to_date=${to}`;

            const apiResponse = await axios.get(url);
            const rawArticles = apiResponse.data.results || [];
            
            // 3. Normalize and Batch Process with AI
            if (rawArticles.length > 0) {
                const normalized = normalizeExternalArticles(rawArticles);
                liveArticles = await batchScoreArticles(normalized);
            }
        }

        // 4. Combine and Sort
        const allResults = [...cachedResults, ...liveArticles].sort((a, b) => b.ai_score - a.ai_score);

        return res.json({
            query: q,
            count: allResults.length,
            articles: allResults
        });

    } catch (error) {
        logger.error('Search failed:', error.message);
        return res.status(200).json({ 
            query: q, 
            articles: [], 
            warning: 'Search failed or rate limited.' 
        });
    }
}

module.exports = {
    getTrendingNews,
    searchNews
};








