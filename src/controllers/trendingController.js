const { getCache, setCache } = require('../utils/cache');
const { logger } = require('../utils/logger');
const { getGroqCompletion } = require('../services/groqClient');

const RAW_NEWS_CACHE_KEY = 'trending_news_raw';
const AI_FILTERED_CACHE_KEY = 'trending_news_ai_filtered';
const CACHE_EXPIRY_SECONDS = 3600; // Cache AI results for 1 hour

/**
 * System prompt instructing the AI how to analyze and format the news article data.
 */
const SYSTEM_PROMPT = `
You are an expert news analyst specializing in technology and business.
Your task is to analyze a news article's title, summary, and content.
You must perform three tasks and return the results as a single JSON object:
1. Score the article's relevance and depth on a scale of 1 to 10. (high score for deeply relevant, detailed articles)
2. Provide a concise, 1-2 sentence summary (less than 30 words) focusing on the core business/tech impact.
3. Categorize the article into one of the following categories: 'AI/ML', 'Web3/Crypto', 'FinTech', 'Cloud/Infra', 'Mobile/Consumer', or 'Other'.

Your response MUST be a JSON object with the following structure only:
{
  "ai_score": integer,
  "ai_summary": string,
  "ai_category": string
}
`;

/**
 * Uses the Groq API to score, summarize, and categorize a single news article.
 * @param {object} article - The article object from the raw news aggregator.
 * @returns {Promise<object|null>} The article object augmented with AI fields, or null on failure.
 */
async function filterSingleArticle(article) {
    if (!article || !article.title || !article.description) {
        logger.warn('Skipping article due to missing title or description.');
        return null;
    }

    const userPrompt = `
    Analyze the following article:
    Title: "${article.title}"
    Summary: "${article.description}"
    `;

    // CRITICAL FIX: Explicitly pass the supported model name.
    const aiResult = await getGroqCompletion(
        SYSTEM_PROMPT,
        userPrompt,
        'llama-3.1-8b-instant' 
    );

    if (aiResult && aiResult.ai_score && aiResult.ai_summary) {
        return {
            ...article,
            ai_score: aiResult.ai_score,
            ai_summary: aiResult.ai_summary,
            ai_category: aiResult.ai_category || 'Other',
        };
    } else {
        logger.error(`AI analysis failed for article: "${article.title}"`);
        // Return a default structure on failure to prevent entire request from crashing
        return {
            ...article,
            ai_score: 5,
            ai_summary: "AI analysis failed.",
            ai_category: "Error",
        };
    }
}

/**
 * Filters, scores, and caches trending news data using AI models.
 * @returns {Promise<Array<object>>} A list of filtered and scored news articles.
 */
async function getFilteredNews() {
    // 1. Check AI-filtered cache first
    const cachedFilteredNews = await getCache(AI_FILTERED_CACHE_KEY);
    if (cachedFilteredNews) {
        logger.info('Returning AI-filtered results from cache.');
        return cachedFilteredNews;
    }

    // 2. Load raw news data
    const rawNews = await getCache(RAW_NEWS_CACHE_KEY);
    if (!rawNews || rawNews.length === 0) {
        logger.warn('Raw news data is missing. Cannot perform AI filtering.');
        return [];
    }
    
    // 3. Process news in parallel using the AI model
    logger.info(`Starting AI filtering for ${rawNews.length} articles...`);
    const promises = rawNews.map(article => filterSingleArticle(article));
    
    // Wait for all AI calls to complete
    const results = await Promise.all(promises);

    // Filter out any articles that failed AI analysis (returned null)
    const filteredAndScoredNews = results.filter(item => item !== null);

    // 4. Sort and Cache
    if (filteredAndScoredNews.length > 0) {
        // Sort by AI score (highest first)
        filteredAndScoredNews.sort((a, b) => b.ai_score - a.ai_score);

        // Save the filtered results to cache
        await setCache(AI_FILTERED_CACHE_KEY, filteredAndScoredNews, CACHE_EXPIRY_SECONDS);
        logger.info(`Successfully filtered and cached ${filteredAndScoredNews.length} articles.`);
        return filteredAndScoredNews;
    }

    logger.warn('AI filtering completed but no articles passed the filter process.');
    return [];
}

module.exports = { getFilteredNews };