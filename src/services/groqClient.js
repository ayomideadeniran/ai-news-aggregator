const Groq = require('groq-sdk');
const { logger } = require('../utils/logger');

let groq;

// Initialize Groq SDK only if the API key is present
if (process.env.GROQ_API_KEY) {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
  });
  logger.info('Groq SDK initialized.');
} else {
  logger.error('GROQ_API_KEY is missing. AI filtering will be skipped.');
}

/**
 * Executes a Groq Chat Completion call, optimized for structured JSON output.
 * * @param {string} systemContent - System instruction.
 * @param {string} userContent - User prompt/data.
 * @param {string} model - The Groq model to use (defaulting to the fast 8b version).
 * @returns {Promise<string|object>} The structured JSON output from the model.
 */
// NOTE: Model is updated to a currently supported version
async function getGroqCompletion(systemContent, userContent, model = 'llama-3.1-8b-instant') { 
  if (!groq) return null;

  const messages = [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent }
  ];
  
  const options = {
    model: model,
    messages: messages,
    temperature: 0.1, // Low temperature for factual, consistent JSON output
    // Request JSON object output format for reliable structured data
    response_format: { type: 'json_object' } 
  };
  
  try {
    const chatCompletion = await groq.chat.completions.create(options);
    
    // Extract content and attempt to parse JSON
    const content = chatCompletion.choices[0].message.content;
    try {
        return JSON.parse(content);
    } catch (e) {
        logger.error('Failed to parse JSON response from Groq:', content);
        return null;
    }

  } catch (error) {
    // CRITICAL FIX: Log the full error object for definitive debugging
    logger.error('Full Groq API Error:', error); 
    return null;
  }
}

module.exports = { getGroqCompletion };





