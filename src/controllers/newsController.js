const axios = require('axios');
const Groq = require('groq-sdk');
const { getCache } = require('../utils/cache'); 
const { logger } = require('../utils/logger');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY }); 
const CACHE_KEY_TRENDING = 'trending_news_ai_filtered'; 

/**
 * 1. HELPER: Universal Normalizer
 * Standardizes different API response formats (NewsData vs GNews vs others)
 */
function normalizeArticle(article, sourceName) {
    return {
        title: article.title || article.name || "No Title",
        description: article.description || article.snippet || article.content || "",
        link: article.link || article.url,
        source: sourceName || article.source_id || article.source?.name || "Unknown",
        pubDate: article.pubDate || article.publishedAt,
        ai_score: 1, // Default before processing
        ai_summary: '',
        ai_category: ''
    };
}

/**
 * 2. HELPER: De-duplicate articles by Title
 */
function deduplicateArticles(articles) {
    const seenTitles = new Set();
    return articles.filter(article => {
        const title = article.title?.toLowerCase().trim();
        if (seenTitles.has(title)) return false;
        seenTitles.add(title);
        return true;
    });
}

/**
 * 3. HELPER: Batch AI Scoring
 */
async function batchScoreArticles(articles) {
    if (!articles || articles.length === 0) return [];

    const articlesList = articles.map((a, i) => `[ID: ${i}] Title: ${a.title}`).join('\n');
    const prompt = `Analyze these ${articles.length} news articles. Output a JSON object with a key "results" containing an array of objects. 
    Each object MUST have: "id" (the number provided), "score" (1-10 relevance to Tech/AI/Web3), "summary" (1-sentence), and "category" (AI/ML, Web3, or Other).

    Articles:
    ${articlesList}`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.1-8b-instant',
            response_format: { type: 'json_object' },
            temperature: 0.1,
        });

        const usage = chatCompletion.usage;
        logger.info(`[Groq Usage] Tokens: ${usage.total_tokens}`);

        const aiResults = JSON.parse(chatCompletion.choices[0].message.content).results;

        return articles.map((article, index) => {
            const ai = aiResults.find(r => r.id === index) || {};
            return {
                ...article,
                ai_score: ai.score || 1,
                ai_summary: ai.summary || 'Summary unavailable.',
                ai_category: ai.category || 'Other'
            };
        });
    } catch (error) {
        logger.error("Batch AI Analysis failed:", error.message);
        return articles;
    }
}

/**
 * MAIN: GET /api/search?q=query
 */
async function searchNews(req, res) {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Search query "q" is required.' });

    try {
        // 1. Check Redis Cache first
        const cachedArticles = await getCache(CACHE_KEY_TRENDING) || [];
        const cachedResults = cachedArticles.filter(a => a.title?.toLowerCase().includes(q.toLowerCase()));

        // 2. Prepare Parallel API Tasks
        const apiTasks = [];

        // Task: NewsData.io
        if (process.env.NEWSDATA_API_KEY) {
            apiTasks.push(
                axios.get(`https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}&qInTitle=${encodeURIComponent(q)}&language=en&size=10`)
                .then(r => {
                    logger.info(`[NewsData.io] Remaining Credits: ${r.headers['x-ratelimit-remaining']}`);
                    return (r.data.results || []).map(a => normalizeArticle(a, 'NewsData'));
                })
            );
        }

        // Task: GNews.io (Optional fallback)
        if (process.env.GNEWS_API_KEY) {
            apiTasks.push(
                axios.get(`https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&token=${process.env.GNEWS_API_KEY}&lang=en`)
                .then(r => (r.data.articles || []).map(a => normalizeArticle(a, 'GNews')))
            );
        }

        // 3. Execute APIs in Parallel
        const taskResults = await Promise.allSettled(apiTasks);
        const liveArticles = taskResults
            .filter(res => res.status === 'fulfilled')
            .map(res => res.value)
            .flat();

        // 4. Combine, Deduplicate, and AI Score
        const combinedRaw = [...cachedResults, ...liveArticles];
        const uniqueArticles = deduplicateArticles(combinedRaw);
        
        // Only AI Score the top 12 to save tokens
        const finalResults = await batchScoreArticles(uniqueArticles.slice(0, 12));

        return res.json({
            query: q,
            count: finalResults.length,
            articles: finalResults.sort((a, b) => b.ai_score - a.ai_score)
        });

    } catch (error) {
        logger.error('Search failed:', error.message);
        return res.status(500).json({ message: 'Internal server error during search.' });
    }
}

/**
 * GET /api/trending
 */
async function getTrendingNews(req, res) {
    try {
        const filteredArticles = await getCache(CACHE_KEY_TRENDING);
        if (!filteredArticles) return res.status(404).json({ message: 'No data.' });
        const sorted = filteredArticles.sort((a, b) => b.ai_score - a.ai_score);
        return res.json({ count: sorted.length, articles: sorted });
    } catch (error) {
        return res.status(500).json({ message: 'Error' });
    }
}

module.exports = { getTrendingNews, searchNews };