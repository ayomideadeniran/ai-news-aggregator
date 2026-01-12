const axios = require('axios');
const Groq = require('groq-sdk');
const { getCache, setCache } = require('../utils/cache');
const { logger } = require('../utils/logger');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const CACHE_KEY_TRENDING = 'trending_news_ai_filtered';

/**
 * 1. HELPER: Universal Normalizer
 */
function normalizeArticle(article, sourceName) {
    const item = article.data || article;

    let link = item.link || item.url;
    let source = sourceName || item.source_id || "Unknown";
    let date = item.pubDate || item.publishedAt;

    if (sourceName === 'Reddit') {
        link = item.url.startsWith('http') ? item.url : `https://reddit.com${item.permalink}`;
        source = `r/${item.subreddit}`;
        date = item.created_utc ? new Date(item.created_utc * 1000).toISOString() : new Date().toISOString();
    }

    return {
        title: item.title || item.name || "No Title",
        description: (item.selftext || item.description || item.snippet || "").substring(0, 300),
        link: link,
        source: source,
        pubDate: date,
        ai_score: 1,
        ai_summary: '',
        ai_category: '',
        sentiment: 'Neutral'
    };
}

/**
 * 2. HELPER: De-duplicate
 */
function deduplicateArticles(articles) {
    const seenTitles = new Set();
    return articles.filter(article => {
        const title = article.title?.toLowerCase().trim();
        if (!title || seenTitles.has(title)) return false;
        seenTitles.add(title);
        return true;
    });
}

/**
 * 3. HELPER: Batch AI Scoring with Usage Tracking
 */
async function batchScoreArticles(articles) {
    if (!articles || articles.length === 0) return [];

    const articlesList = articles.map((a, i) =>
        `ID: ${i}\nTitle: ${a.title}\nDescription: ${a.description.substring(0, 150)}`
    ).join('\n---\n');

    const prompt = `You are a tech news analyzer. Analyze these ${articles.length} news items.
    Return a JSON object with exactly one key "results" containing an array of objects.
    
    Each object MUST have:
    - "id": (The number provided)
    - "score": (1-10 rating of Tech/AI relevance)
    - "summary": (1 short sentence)
    - "category": ("AI", "Web3", "Software", or "Tech")
    - "sentiment": ("Bullish", "Bearish", or "Neutral")

    Articles:
    ${articlesList}`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'You only output valid JSON.' },
                { role: 'user', content: prompt }
            ],
            model: 'llama-3.1-8b-instant',
            response_format: { type: 'json_object' },
            temperature: 0.1,
        });

        // --- LOG GROQ USAGE ---
        const usage = chatCompletion.usage;
        if (usage) {
            logger.info(`[AI USAGE] Tokens: ${usage.total_tokens} | Prompt: ${usage.prompt_tokens} | Completion: ${usage.completion_tokens}`);
        }

        const aiResults = JSON.parse(chatCompletion.choices[0].message.content).results;

        return articles.map((article, index) => {
            const ai = aiResults.find(r => r.id === index);
            if (!ai) return article;

            return {
                ...article,
                ai_score: ai.score || 1,
                ai_summary: ai.summary || 'Summary unavailable.',
                ai_category: ai.category || 'Tech',
                sentiment: ai.sentiment || 'Neutral'
            };
        });
    } catch (error) {
        logger.error("AI Analysis failed: " + error.message);
        return articles;
    }
}

/**
 * MAIN: GET /api/search?q=query
 */
async function searchNews(req, res) {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Search query "q" is required.' });

    const QUERY_CACHE_KEY = `search_cache:${req.userId}:${q.toLowerCase().trim()}`;

    try {
        // 1. Check Redis Cache
        const cachedSearch = await getCache(QUERY_CACHE_KEY);
        if (cachedSearch) {
            logger.info(`[Redis] Cache Hit: ${q}`);
            return res.json(cachedSearch);
        }

        // 2. Parallel API Tasks
        const apiTasks = [];

        // NewsData.io (Logging Status)
        if (process.env.NEWSDATA_API_KEY) {
            apiTasks.push(
                axios.get(`https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}&qInTitle=${encodeURIComponent(q)}&language=en&size=10`)
                    .then(r => {
                        logger.info(`[API USAGE] NewsData: Success | Results: ${r.data.totalResults || 0}`);
                        return (r.data.results || []).map(a => normalizeArticle(a, 'NewsData'));
                    })
                    .catch(e => { logger.error(`NewsData failed: ${e.message}`); return []; })
            );
        }

        // GNews.io
        if (process.env.GNEWS_API_KEY) {
            apiTasks.push(
                axios.get(`https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&token=${process.env.GNEWS_API_KEY}&lang=en`)
                    .then(r => {
                        logger.info(`[API USAGE] GNews: Success`);
                        return (r.data.articles || []).map(a => normalizeArticle(a, 'GNews'));
                    })
                    .catch(e => { logger.error(`GNews failed: ${e.message}`); return []; })
            );
        }

        // Reddit: Tracking Rate Limits
        apiTasks.push(
            axios.get(`https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&limit=12&sort=relevance&t=month`, {
                headers: { 'User-Agent': 'AI-News-Aggregator/1.0' }
            })
                .then(r => {
                    const remaining = r.headers['x-ratelimit-remaining'];
                    const reset = r.headers['x-ratelimit-reset'];
                    logger.info(`[API USAGE] Reddit: Success | RateLimit Remaining: ${remaining} | Resets in: ${reset}s`);
                    return (r.data.data.children || []).map(a => normalizeArticle(a, 'Reddit'));
                })
                .catch(e => { logger.error(`Reddit failed: ${e.message}`); return []; })
        );

        // HackerNews (Algolia API)
        apiTasks.push(
            axios.get(`http://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=10`)
                .then(r => {
                    logger.info(`[API USAGE] HackerNews: Success | Results: ${r.data.nbHits}`);
                    return (r.data.hits || []).map(a => ({
                        title: a.title,
                        description: a.story_text || `Discussion on HackerNews about ${a.title}`,
                        link: a.url || `https://news.ycombinator.com/item?id=${a.objectID}`,
                        source: 'HackerNews',
                        pubDate: a.created_at,
                        ai_score: 1,
                        ai_summary: '',
                        ai_category: '',
                        sentiment: 'Neutral'
                    }));
                })
                .catch(e => { logger.error(`HackerNews search failed: ${e.message}`); return []; })
        );

        // 3. Resolve Parallel Requests
        const taskResults = await Promise.allSettled(apiTasks);
        const liveArticles = taskResults
            .filter(res => res.status === 'fulfilled')
            .map(res => res.value)
            .flat();

        // 4. Combine & Deduplicate
        const trendingCache = await getCache(CACHE_KEY_TRENDING) || [];
        const cachedMatches = trendingCache.filter(a => a.title?.toLowerCase().includes(q.toLowerCase()));
        const uniqueArticles = deduplicateArticles([...cachedMatches, ...liveArticles]);

        // 5. AI Scoring (Usage is logged inside this function)
        const scoredArticles = await batchScoreArticles(uniqueArticles.slice(0, 15));

        // 6. Quality Filtering
        const finalResults = scoredArticles
            .filter(a => a.ai_score >= 3)
            .sort((a, b) => b.ai_score - a.ai_score);

        const responsePayload = {
            query: q,
            count: finalResults.length,
            articles: finalResults
        };

        // 7. Store in Cache
        await setCache(QUERY_CACHE_KEY, responsePayload, 1800);

        return res.json(responsePayload);

    } catch (error) {
        logger.error('Search error: ' + error.message);
        return res.status(500).json({ message: 'Internal server error.' });
    }
}

/**
 * GET /api/trending
 */
const { fetchAndNormalizeNews } = require('../services/aggregator');

/**
 * GET /api/trending
 */
const AI_FILTERED_CACHE_KEY = 'trending_news_ai_filtered';
const CACHE_EXPIRY_SECONDS = 3600;

/**
 * GET /api/trending
 */
async function getTrendingNews(req, res) {
    try {
        const forceRefresh = req.query.refresh === 'true';

        // 1. Check AI-filtered cache first (unless refreshing)
        if (!forceRefresh) {
            const cachedFilteredNews = await getCache(AI_FILTERED_CACHE_KEY);
            if (cachedFilteredNews) {
                logger.info('Returning AI-filtered results from cache.');

                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const startIndex = (page - 1) * limit;
                const endIndex = page * limit;
                const paginatedArticles = cachedFilteredNews.slice(startIndex, endIndex);

                return res.json({
                    count: cachedFilteredNews.length,
                    page,
                    limit,
                    hasMore: endIndex < cachedFilteredNews.length,
                    articles: paginatedArticles
                });
            }
        }

        // 2. If no cache or forced refresh, fetch fresh data
        logger.info('Cache miss or refresh requested. Fetching fresh news...');

        // Fetch raw data from all sources
        const rawNews = await fetchAndNormalizeNews();

        if (!rawNews || rawNews.length === 0) {
            return res.status(503).json({ message: 'Failed to fetch news from sources.' });
        }

        // 3. Process news in parallel using the AI model (Batch Mode)
        // Deduplicate first
        const uniqueArticles = deduplicateArticles(rawNews);

        logger.info(`Starting AI filtering for ${uniqueArticles.length} articles...`);

        // Limit to 20 for batch processing to save tokens/time
        const scoredArticles = await batchScoreArticles(uniqueArticles.slice(0, 20));

        // 4. Sort and Cache
        if (scoredArticles.length > 0) {
            // Filter low quality
            const highQualityNews = scoredArticles
                .filter(a => a.ai_score >= 3)
                .sort((a, b) => b.ai_score - a.ai_score);

            await setCache(AI_FILTERED_CACHE_KEY, highQualityNews, CACHE_EXPIRY_SECONDS);

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;

            const paginatedArticles = highQualityNews.slice(startIndex, endIndex);

            return res.json({
                count: highQualityNews.length,
                page,
                limit,
                hasMore: endIndex < highQualityNews.length,
                articles: paginatedArticles
            });
        }

        return res.status(404).json({ message: 'No articles passed the AI filter.' });

    } catch (error) {
        logger.error('Error in getTrendingNews:', error);
        return res.status(500).json({ message: 'Error fetching trending news.' });
    }
}



/**
 * POST /api/v1/trending/save
 * Saves an article for a specific user
 */
async function saveArticle(req, res) {
    try {
        const { article } = req.body;
        if (!article || !article.link) {
            return res.status(400).json({ message: 'Article data with link is required.' });
        }

        const SAVED_CACHE_KEY = `saved_articles:${req.userId}`;

        // Get existing saved articles
        let saved = await getCache(SAVED_CACHE_KEY) || [];

        // Check if already saved
        if (saved.some(a => a.link === article.link)) {
            return res.json({ message: 'Article already saved.', count: saved.length });
        }

        // Add to list
        saved.push(article);

        // Save back to Redis (no expiry for saved articles)
        await setCache(SAVED_CACHE_KEY, saved, 0);

        return res.json({ message: 'Article saved successfully.', count: saved.length });
    } catch (error) {
        logger.error('Save article error: ' + error.message);
        return res.status(500).json({ message: 'Error saving article.' });
    }
}

/**
 * GET /api/v1/trending/saved
 * Retrieves saved articles for a specific user
 */
async function getSavedArticles(req, res) {
    try {
        const SAVED_CACHE_KEY = `saved_articles:${req.userId}`;
        const saved = await getCache(SAVED_CACHE_KEY) || [];

        return res.json({
            count: saved.length,
            articles: saved
        });
    } catch (error) {
        logger.error('Get saved articles error: ' + error.message);
        return res.status(500).json({ message: 'Error fetching saved articles.' });
    }
}

module.exports = { getTrendingNews, searchNews, saveArticle, getSavedArticles };