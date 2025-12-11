const { getAggregatedNews } = require('../services/aggregator');
const { getGroqCompletion } = require('../services/groqClient');
const { getCache, setCache } = require('../utils/cache');
const { logger } = require('../utils/logger');

const AI_CACHE_KEY = 'trending_news_ai_filtered';
const AI_CACHE_TTL = 600; // 10 minutes

// The desired JSON output structure for the model
const RESPONSE_SCHEMA = {
    type: "object",
    properties: {
        relevance_score: {
            type: "integer",
            description: "A score from 1 to 10 indicating how relevant this article is to modern AI and technology. 10 is most relevant."
        },
        category: {
            type: "string",
            description: "The primary topic of the article, chosen from: 'LLMs', 'Hardware', 'Ethics & Policy', 'Funding & Business', 'Other Tech'."
        },
        summary: {
            type: "string",
            description: "A single, concise sentence summarizing the article's main point."
        }
    },
    required: ["relevance_score", "category", "summary"]
};

const SYSTEM_PROMPT = `You are a sophisticated AI News Analyst. Your task is to analyze a single news item (title and source) and generate a JSON object based *only* on the provided JSON schema. Do not add any extra text or conversational response. Use the relevance score and category descriptions provided. The entire output must be a valid JSON object.`;


async function getFilteredNews() {
    // 1. Check for AI-filtered data in cache
    const cachedData = await getCache(AI_CACHE_KEY);
    if (cachedData) {
        logger.info('Serving AI-filtered news from Redis Cache 🧠');
        return cachedData;
    }

    logger.info('AI cache miss. Starting aggregation and filtering... ⏳');
    
    // 2. Get the raw news data (this will use the 5-minute cache or fetch fresh)
    const rawNews = await getAggregatedNews();
    if (rawNews.length === 0) {
        logger.warn('No raw news data found to process.');
        return [];
    }

    // 3. Process the news items in parallel using Groq
    const filterPromises = rawNews.map(item => {
        const userPrompt = `Analyze this news item: Title: "${item.title}", Source: "${item.source}"`;
        const systemPromptWithSchema = `${SYSTEM_PROMPT}\n\nSchema: ${JSON.stringify(RESPONSE_SCHEMA)}`;

        // Use a powerful, fast model and request JSON output
        return getGroqCompletion(
            systemPromptWithSchema,
            userPrompt,
            'llama3-8b-8192' 
        );
    });

    const filteredResults = await Promise.all(filterPromises);

    // 4. Merge results back into the original array and filter failed AI calls
    const finalFilteredNews = rawNews.map((item, index) => {
        const aiData = filteredResults[index];
        if (aiData && aiData.relevance_score && aiData.summary) {
            return {
                ...item,
                ai_score: aiData.relevance_score,
                ai_category: aiData.category,
                ai_summary: aiData.summary
            };
        }
        // If filtering failed, return the original item with default scores
        return { ...item, ai_score: 5, ai_category: 'Uncategorized', ai_summary: 'AI analysis failed or was skipped.' };

    }).sort((a, b) => b.ai_score - a.ai_score); // Sort by AI score, highest first

    // 5. Save the final, scored list back to the AI cache
    await setCache(AI_CACHE_KEY, finalFilteredNews, AI_CACHE_TTL);
    logger.info(`Successfully processed and filtered ${finalFilteredNews.length} articles.`);
    
    return finalFilteredNews;
}

module.exports = { getFilteredNews };